// Validation for what the browser sends when a visitor submits the diagnostic.
// Source of truth: docs/spec.md, sections 4, 8 and 9. Limits match the database checks.
// Objects are strict: the browser cannot set scores, level or any other server-side field.

import { z } from "zod";
import { COMPANY_SIZES, INDUSTRIES } from "@/lib/company";
import { DIMENSIONS, type Dimension } from "@/lib/scoring";

// Inferred as 0 | 1 | 2 | 3, so parsed answers feed scoreDiagnostic without casts.
const answer = z.literal([0, 1, 2, 3]);
const dimensionAnswers = z.tuple([answer, answer, answer]);

const answersShape = Object.fromEntries(
  DIMENSIONS.map((dimension) => [dimension, dimensionAnswers]),
) as Record<Dimension, typeof dimensionAnswers>;

export const submissionSchema = z.strictObject({
  industry: z.enum(INDUSTRIES),
  companySize: z.enum(COMPANY_SIZES),
  answers: z.strictObject(answersShape),
  contact: z.strictObject({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().max(320).pipe(z.email()),
    company: z.string().trim().min(1).max(200),
  }),
  consent: z.literal(true),
});

export type Submission = z.infer<typeof submissionSchema>;
