// Handles a visitor's diagnostic submission. Source of truth: docs/spec.md, sections 8 and 9.
// Storage and logging are injected so the flow can be tested without Supabase.

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

export interface SubmitDependencies {
  store: DiagnosticsStore;
  salt: string;
  logger: Logger;
  now: () => Date;
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

    const score = scoreDiagnostic(submission.answers);
    await deps.store.insert({
      company: submission.contact.company,
      contact_name: submission.contact.name,
      email: submission.contact.email,
      industry: submission.industry,
      company_size: submission.companySize,
      answers: submission.answers,
      scores: { dimensions: score.dimensions, global: score.global },
      level: score.level,
      consent: submission.consent,
      ip_hash: ipHash,
    });
    return Response.json({ score }, { status: 201 });
  } catch {
    deps.logger.error("diagnostic storage failed");
    return Response.json(
      { error: "Could not save your diagnostic. Please try again." },
      { status: 500 },
    );
  }
}
