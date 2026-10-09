// Handles a visitor's diagnostic submission. Source of truth: docs/spec.md, sections 7, 8 and 9.
// Storage, logging and the report generator are injected so the flow can be tested without
// Supabase or a real model.

import { reportSchema, type Report } from "@/lib/report";
import { reportInputFrom, type ReportInput } from "@/lib/report-prompt";
import { getClientIp, hashIp, MISSING_IP_KEY } from "@/lib/server/client-ip";
import { scoreDiagnostic, type Answers, type Dimension } from "@/lib/scoring";
import { submissionSchema } from "@/lib/submission";

export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export interface DiagnosticRow {
  company: string;
  contact_name: string;
  email: string;
  industry: string;
  company_size: string;
  answers: Answers;
  scores: { dimensions: Record<Dimension, number>; global: number };
  level: number;
  report: Report | null;
  consent: true;
  ip_hash: string;
}

export interface DiagnosticsStore {
  countSince(ipHash: string, since: Date): Promise<number>;
  insert(row: DiagnosticRow): Promise<void>;
}

// Messages passed to the logger never include personal data.
export interface Logger {
  warn(message: string): void;
  error(message: string): void;
}

// Receives only industry, size, score and answers; throws when no valid report can be made.
export type ReportGenerator = (input: ReportInput) => Promise<Report>;

export interface SubmitDependencies {
  store: DiagnosticsStore;
  salt: string;
  logger: Logger;
  now: () => Date;
  // null when the provider is not configured: diagnostics are still saved, without a report.
  generateReport: ReportGenerator | null;
}

// Only the error's class name is logged (for example AI_NoObjectGeneratedError), never its
// message or the model's text. Names that are generic or not identifier-like log as "unknown".
const ERROR_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

export function errorName(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  const { name } = error;
  return name !== "Error" && ERROR_NAME_PATTERN.test(name) ? name : "unknown";
}

// The report is optional: any failure leaves it null and the diagnostic is saved anyway.
async function tryReport(
  input: ReportInput,
  generate: ReportGenerator | null,
  logger: Logger,
): Promise<Report | null> {
  if (generate === null) {
    logger.warn("report generation disabled");
    return null;
  }
  let failure: string;
  try {
    const parsed = reportSchema.safeParse(await generate(input));
    if (parsed.success) return parsed.data;
    failure = errorName(parsed.error);
  } catch (error) {
    failure = errorName(error);
  }
  logger.warn(`report generation failed: ${failure}`);
  return null;
}

export async function submitDiagnostic(request: Request, deps: SubmitDependencies): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }
  const submission = parsed.data;

  const ip = getClientIp(request.headers);
  if (ip === null) deps.logger.warn("missing client IP header");
  const ipHash = hashIp(ip ?? MISSING_IP_KEY, deps.salt);

  try {
    // Count, then insert: not atomic, so simultaneous requests can slip past the limit.
    // Acceptable for the basic limit the spec asks for.
    const since = new Date(deps.now().getTime() - RATE_LIMIT_WINDOW_MS);
    if ((await deps.store.countSince(ipHash, since)) >= RATE_LIMIT_MAX) {
      return Response.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 },
      );
    }

    // Score and level come from the answers only; the model never changes them.
    const score = scoreDiagnostic(submission.answers);
    const report = await tryReport(
      reportInputFrom(submission, score),
      deps.generateReport,
      deps.logger,
    );
    await deps.store.insert({
      company: submission.contact.company,
      contact_name: submission.contact.name,
      email: submission.contact.email,
      industry: submission.industry,
      company_size: submission.companySize,
      answers: submission.answers,
      scores: { dimensions: score.dimensions, global: score.global },
      level: score.level,
      report,
      consent: submission.consent,
      ip_hash: ipHash,
    });
    return Response.json({ score, report }, { status: 201 });
  } catch {
    deps.logger.error("diagnostic storage failed");
    return Response.json(
      { error: "Could not save your diagnostic. Please try again." },
      { status: 500 },
    );
  }
}
