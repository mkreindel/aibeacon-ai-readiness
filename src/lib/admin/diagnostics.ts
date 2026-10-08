// Reads diagnostics for the admin panel. Rows come from Supabase under the signed-in
// user's RLS policies; they are validated before rendering so bad data fails loudly.

import { z } from "zod";
import { DIMENSIONS, type Answers, type DiagnosticScore, type Dimension, type Level } from "@/lib/scoring";
import { answersSchema } from "@/lib/submission";

export const LIST_LIMIT = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDiagnosticId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export interface DiagnosticsReader {
  list(limit: number): Promise<unknown[]>;
  getById(id: string): Promise<unknown | null>;
}

const score = z.number().int().min(0).max(100);
const scoresSchema = z.object({
  dimensions: z.object(
    Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, score])) as Record<Dimension, typeof score>,
  ),
  global: score,
});

const summaryRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  company: z.string(),
  industry: z.string(),
  company_size: z.string(),
  scores: scoresSchema,
  level: z.literal([1, 2, 3]),
  is_demo: z.boolean(),
});

const detailRowSchema = summaryRowSchema.extend({
  contact_name: z.string(),
  email: z.string(),
  answers: answersSchema,
});

export interface DiagnosticSummary {
  id: string;
  createdAt: Date;
  company: string;
  industry: string;
  companySize: string;
  level: Level;
  global: number;
  isDemo: boolean;
}

export interface DiagnosticDetail extends Omit<DiagnosticSummary, "level" | "global"> {
  contactName: string;
  email: string;
  answers: Answers;
  score: DiagnosticScore;
}

function toSummary(row: z.infer<typeof summaryRowSchema>): DiagnosticSummary {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    company: row.company,
    industry: row.industry,
    companySize: row.company_size,
    level: row.level,
    global: row.scores.global,
    isDemo: row.is_demo,
  };
}

export async function listDiagnostics(reader: DiagnosticsReader): Promise<DiagnosticSummary[]> {
  const rows = await reader.list(LIST_LIMIT);
  return z.array(summaryRowSchema).parse(rows).map(toSummary);
}

// Null when the id is invalid or no row is visible to the current user.
export async function getDiagnostic(reader: DiagnosticsReader, id: string): Promise<DiagnosticDetail | null> {
  if (!isDiagnosticId(id)) return null;
  const row = await reader.getById(id);
  if (row === null) return null;
  const parsed = detailRowSchema.parse(row);
  const { level, global, ...summary } = toSummary(parsed);
  return {
    ...summary,
    contactName: parsed.contact_name,
    email: parsed.email,
    answers: parsed.answers,
    score: { dimensions: parsed.scores.dimensions, global, level },
  };
}
