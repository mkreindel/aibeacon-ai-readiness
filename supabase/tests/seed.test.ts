// Applies the migrations, the demo seed and the demo reports to an in-memory Postgres (PGlite)
// and checks that the seed is idempotent, clearly fictional, visible to the demo user, that its
// stored scores match scoreDiagnostic and that every demo report validates with reportSchema.
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { reportSchema } from "@/lib/report";
import { scoreDiagnostic, type Answers } from "@/lib/scoring";

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);
const SEED = readFileSync(new URL("../seed/demo-data.sql", import.meta.url), "utf8");
const REPORTS = readFileSync(new URL("../seed/demo-reports.sql", import.meta.url), "utf8");
const DEMO = "00000000-0000-0000-0000-00000000000d";

let db: PGlite;

interface SeedRow {
  id: string;
  email: string;
  answers: Answers;
  scores: { dimensions: Record<string, number>; global: number };
  level: number;
  report: unknown;
  is_demo: boolean;
  ip_hash: string | null;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(file, MIGRATIONS_DIR), "utf8"));
  }
  await db.exec(`
    insert into auth.users values ('${DEMO}');
    insert into public.panel_users (user_id, role) values ('${DEMO}', 'demo');
  `);
  await db.exec(SEED);
  await db.exec(REPORTS);
}, 30_000);

const rows = async () =>
  (await db.query<SeedRow>("select * from public.diagnostics order by created_at")).rows;

describe("demo seed", () => {
  it("inserts 6 rows and is idempotent", async () => {
    expect(await rows()).toHaveLength(6);
    await db.exec(SEED);
    expect(await rows()).toHaveLength(6);
  });

  it("is clearly fictional demo data", async () => {
    for (const row of await rows()) {
      expect(row.is_demo).toBe(true);
      expect(row.email).toMatch(/@example\.com$/);
      expect(row.ip_hash).toBeNull();
    }
  });

  it("stores the scores and level that scoreDiagnostic computes", async () => {
    for (const row of await rows()) {
      const score = scoreDiagnostic(row.answers);
      expect(row.scores).toEqual({ dimensions: score.dimensions, global: score.global });
      expect(row.level).toBe(score.level);
    }
  });

  it("covers every level", async () => {
    expect(new Set((await rows()).map((row) => row.level))).toEqual(new Set([1, 2, 3]));
  });

  it("is visible to the demo user under RLS", async () => {
    await db.exec(`select set_config('request.jwt.claim.sub', '${DEMO}', false); set role authenticated;`);
    try {
      const result = await db.query("select id from public.diagnostics");
      expect(result.rows).toHaveLength(6);
    } finally {
      await db.exec("reset role;");
    }
  });
});

describe("demo reports", () => {
  const DEMO_IDS = [1, 2, 3, 4, 5, 6].map((n) => `de000000-0000-4000-8000-00000000000${n}`);

  it("gives each of the 6 demo rows a report that validates with reportSchema", async () => {
    const all = await rows();
    expect(all.map((row) => row.id)).toEqual(DEMO_IDS);
    for (const row of all) {
      const parsed = reportSchema.safeParse(row.report);
      expect(parsed.success, `${row.id}: ${parsed.error?.message}`).toBe(true);
    }
  });

  it("is idempotent", async () => {
    const before = (await rows()).map((row) => row.report);
    await db.exec(REPORTS);
    expect((await rows()).map((row) => row.report)).toEqual(before);
  });

  it("never overwrites a report that is already set", async () => {
    const id = DEMO_IDS[0];
    const kept = { kept: true };
    await db.query("update public.diagnostics set report = $1 where id = $2", [kept, id]);
    try {
      await db.exec(REPORTS);
      const result = await db.query<{ report: unknown }>(
        "select report from public.diagnostics where id = $1",
        [id],
      );
      expect(result.rows[0].report).toEqual(kept);
    } finally {
      await db.query("update public.diagnostics set report = null where id = $1", [id]);
      await db.exec(REPORTS);
    }
  });

  it("touches only the 6 demo rows", async () => {
    const otherId = "11111111-1111-4111-8111-111111111111";
    await db.query(
      `insert into public.diagnostics
         (id, company, contact_name, email, industry, company_size, answers, scores, level, consent, is_demo)
       select $1, company, contact_name, email, industry, company_size, answers, scores, level, true, false
       from public.diagnostics where id = $2`,
      [otherId, DEMO_IDS[0]],
    );
    try {
      await db.exec(REPORTS);
      const result = await db.query<{ report: unknown }>(
        "select report from public.diagnostics where id = $1",
        [otherId],
      );
      expect(result.rows[0].report).toBeNull();
    } finally {
      await db.query("delete from public.diagnostics where id = $1", [otherId]);
    }
  });
});
