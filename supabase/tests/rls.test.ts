// Applies every migration to an in-memory Postgres (PGlite) and checks access rules
// and constraints from docs/spec.md, sections 8 and 9.
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const DEMO = "00000000-0000-0000-0000-00000000000d";
const OUTSIDER = "00000000-0000-0000-0000-0000000000ff";
const IP_HASH = "a".repeat(64);

const VALID_ROW = {
  company: "'Test Co'",
  contact_name: "'Test Person'",
  email: "'test@example.com'",
  industry: "'Retail'",
  company_size: "'1-10'",
  answers: "'{}'",
  scores: "'{}'",
  level: "1",
  consent: "true",
  ip_hash: "null",
  is_demo: "false",
};

function insertSql(overrides: Partial<Record<keyof typeof VALID_ROW, string>> = {}) {
  const row = { ...VALID_ROW, ...overrides };
  return `insert into public.diagnostics (${Object.keys(row).join(", ")}) values (${Object.values(row).join(", ")})`;
}

let db: PGlite;

// Runs SQL as a Supabase API role, with `sub` as the signed-in user id.
async function as(role: "anon" | "authenticated" | "service_role", sub: string | null, sql: string) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false); set role ${role};`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Minimal stand-ins for what every Supabase project has before our migrations,
  // including its default grants on new public tables.
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

  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    await db.exec(readFileSync(new URL(file, MIGRATIONS_DIR), "utf8"));
  }

  await db.exec(`
    insert into auth.users values ('${ADMIN}'), ('${DEMO}'), ('${OUTSIDER}');
    insert into public.panel_users (user_id, role) values ('${ADMIN}', 'admin'), ('${DEMO}', 'demo');
    ${insertSql({ company: "'Real Co'", ip_hash: `'${IP_HASH}'` })};
    ${insertSql({ company: "'Demo Co'", is_demo: "true" })};
  `);
}, 30_000);

const companies = (rows: Record<string, unknown>[]) =>
  rows.map((row) => row.company).sort();

describe("visitors (anon)", () => {
  it("cannot read diagnostics", async () => {
    await expect(as("anon", null, "select * from public.diagnostics")).rejects.toThrow(/permission denied/);
  });

  it("cannot insert diagnostics", async () => {
    await expect(as("anon", null, insertSql())).rejects.toThrow(/permission denied/);
  });

  it("cannot call the role helper", async () => {
    await expect(as("anon", null, "select private.panel_role()")).rejects.toThrow(/permission denied/);
  });
});

describe("signed-in users", () => {
  it("read nothing when they are not in panel_users", async () => {
    const result = await as("authenticated", OUTSIDER, "select company from public.diagnostics");
    expect(result.rows).toEqual([]);
  });

  it("admin reads every row", async () => {
    const result = await as("authenticated", ADMIN, "select company from public.diagnostics");
    expect(companies(result.rows)).toEqual(["Demo Co", "Real Co"]);
  });

  it("demo reads only demo rows", async () => {
    const result = await as("authenticated", DEMO, "select company from public.diagnostics");
    expect(companies(result.rows)).toEqual(["Demo Co"]);
  });

  it.each([
    ["insert", insertSql()],
    ["update", "update public.diagnostics set company = 'changed'"],
    ["delete", "delete from public.diagnostics"],
  ])("admin cannot %s diagnostics", async (_, sql) => {
    await expect(as("authenticated", ADMIN, sql)).rejects.toThrow(/permission denied/);
  });

  it("cannot read panel_users", async () => {
    await expect(as("authenticated", ADMIN, "select * from public.panel_users")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("cannot add themselves to panel_users", async () => {
    await expect(
      as("authenticated", OUTSIDER, `insert into public.panel_users values ('${OUTSIDER}', 'admin')`),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("server (secret key)", () => {
  it("inserts a diagnostic and counts recent ones by IP hash", async () => {
    await as("service_role", null, insertSql({ company: "'Server Co'", ip_hash: `'${IP_HASH}'` }));
    const result = await as(
      "service_role",
      null,
      `select count(*)::int as n from public.diagnostics
       where ip_hash = '${IP_HASH}' and created_at > now() - interval '1 hour'`,
    );
    expect(result.rows[0].n).toBe(2);
  });

  it.each([
    ["consent false", { consent: "false" }],
    ["an industry outside the list", { industry: "'Mining'" }],
    ["a size outside the list", { company_size: "'201-500'" }],
    ["level 0", { level: "0" }],
    ["level 4", { level: "4" }],
    ["a malformed ip_hash", { ip_hash: "'1.2.3.4'" }],
    ["an email without @", { email: "'nope'" }],
    ["an empty company", { company: "''" }],
    ["answers that are not an object", { answers: "'[1, 2]'" }],
  ])("is rejected by the database for %s", async (_, overrides) => {
    await expect(as("service_role", null, insertSql(overrides))).rejects.toThrow(/check constraint/);
  });
});
