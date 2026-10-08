import { describe, expect, it } from "vitest";
import { hashIp, MISSING_IP_KEY } from "@/lib/server/client-ip";
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  submitDiagnostic,
  type DiagnosticRow,
  type DiagnosticsStore,
} from "@/lib/server/submit-diagnostic";

const SALT = "test-salt";
const NOW = new Date("2026-10-08T15:00:00Z");
const IP = "203.0.113.7";

const validBody = () => ({
  industry: "Retail",
  companySize: "11-50",
  answers: {
    data: [3, 3, 3],
    processes: [3, 3, 3],
    tools: [3, 3, 3],
    team: [3, 3, 3],
    governance: [1, 1, 1],
  },
  contact: { name: "Jane Doe", email: "jane@example.com", company: "Acme" },
  consent: true,
});

function setup({ recent = 0, failInsert = false, failCount = false } = {}) {
  const inserted: DiagnosticRow[] = [];
  const countCalls: { ipHash: string; since: Date }[] = [];
  const logs: string[] = [];
  const store: DiagnosticsStore = {
    async countSince(ipHash, since) {
      countCalls.push({ ipHash, since });
      if (failCount) throw new Error("count failed for jane@example.com");
      return recent;
    },
    async insert(row) {
      if (failInsert) throw new Error("insert failed for jane@example.com");
      inserted.push(row);
    },
  };
  const logger = {
    warn: (message: string) => logs.push(`warn: ${message}`),
    error: (message: string) => logs.push(`error: ${message}`),
  };
  const send = (body: unknown, headers: Record<string, string> = { "x-forwarded-for": IP }) =>
    submitDiagnostic(
      new Request("http://localhost/api/diagnostics", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      { store, salt: SALT, logger, now: () => NOW },
    );
  return { inserted, countCalls, logs, send };
}

describe("submitDiagnostic", () => {
  it("saves the diagnostic with the score computed on the server and returns it", async () => {
    const { inserted, send } = setup();
    const response = await send(validBody());

    expect(response.status).toBe(201);
    // 100 * 4 + 33 = 433 / 5 = 86.6 -> 87; governance 33 keeps it at level 2
    const expectedScore = {
      dimensions: { data: 100, processes: 100, tools: 100, team: 100, governance: 33 },
      global: 87,
      level: 2,
    };
    expect(await response.json()).toEqual({ score: expectedScore });
    expect(inserted).toEqual([
      {
        company: "Acme",
        contact_name: "Jane Doe",
        email: "jane@example.com",
        industry: "Retail",
        company_size: "11-50",
        answers: validBody().answers,
        scores: { dimensions: expectedScore.dimensions, global: 87 },
        level: 2,
        consent: true,
        ip_hash: hashIp(IP, SALT),
      },
    ]);
  });

  it("never stores the IP in clear text", async () => {
    const { inserted, send } = setup();
    await send(validBody());
    expect(inserted[0].ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(inserted)).not.toContain(IP);
  });

  it("uses the first address of x-forwarded-for", async () => {
    const { inserted, send } = setup();
    await send(validBody(), { "x-forwarded-for": `${IP}, 198.51.100.1` });
    expect(inserted[0].ip_hash).toBe(hashIp(IP, SALT));
  });

  describe("rate limit", () => {
    it(`rejects with 429 when the IP already sent ${RATE_LIMIT_MAX} in the last hour`, async () => {
      const { inserted, send } = setup({ recent: RATE_LIMIT_MAX });
      const response = await send(validBody());
      expect(response.status).toBe(429);
      expect(inserted).toEqual([]);
    });

    it(`accepts the submission when the IP sent ${RATE_LIMIT_MAX - 1} in the last hour`, async () => {
      const { inserted, send } = setup({ recent: RATE_LIMIT_MAX - 1 });
      const response = await send(validBody());
      expect(response.status).toBe(201);
      expect(inserted).toHaveLength(1);
    });

    it("counts submissions of the hashed IP over the last hour", async () => {
      const { countCalls, send } = setup();
      await send(validBody());
      expect(countCalls).toEqual([
        { ipHash: hashIp(IP, SALT), since: new Date(NOW.getTime() - RATE_LIMIT_WINDOW_MS) },
      ]);
    });
  });

  describe("missing client IP", () => {
    it("logs a warning, uses a fixed key and still saves the diagnostic", async () => {
      const { inserted, logs, send } = setup();
      const response = await send(validBody(), {});
      expect(response.status).toBe(201);
      expect(logs).toEqual(["warn: missing client IP header"]);
      expect(inserted[0].ip_hash).toBe(hashIp(MISSING_IP_KEY, SALT));
    });
  });

  describe("invalid input", () => {
    it("rejects malformed JSON with 400", async () => {
      const { inserted, send } = setup();
      const response = await send("{not json");
      expect(response.status).toBe(400);
      expect(inserted).toEqual([]);
    });

    it("rejects a body that fails validation with 400 and saves nothing", async () => {
      const { inserted, send } = setup();
      const response = await send({ ...validBody(), consent: false });
      expect(response.status).toBe(400);
      expect(inserted).toEqual([]);
    });

    it("rejects a score sent by the browser", async () => {
      const { inserted, send } = setup();
      const response = await send({ ...validBody(), level: 3 });
      expect(response.status).toBe(400);
      expect(inserted).toEqual([]);
    });

    it("does not echo validation details", async () => {
      const { send } = setup();
      const response = await send({ ...validBody(), contact: { ...validBody().contact, email: "x" } });
      expect(await response.json()).toEqual({ error: "Invalid submission." });
    });
  });

  describe("storage failures", () => {
    it.each([
      ["the insert", { failInsert: true }],
      ["the rate limit count", { failCount: true }],
    ])("returns 500 when %s fails, and logs no personal data", async (_, options) => {
      const { logs, send } = setup(options);
      const response = await send(validBody());
      expect(response.status).toBe(500);
      expect(logs).toEqual(["error: diagnostic storage failed"]);
      expect(logs.join(" ")).not.toMatch(/jane|acme|Jane Doe/i);
    });
  });
});

describe("hashIp", () => {
  it("is deterministic and depends on the salt", () => {
    expect(hashIp(IP, SALT)).toBe(hashIp(IP, SALT));
    expect(hashIp(IP, SALT)).not.toBe(hashIp(IP, "other-salt"));
    expect(hashIp(IP, SALT)).not.toBe(hashIp("198.51.100.1", SALT));
  });
});
