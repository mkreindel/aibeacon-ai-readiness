// Deterministic scoring model. Source of truth: docs/spec.md, section 5.

export const DIMENSIONS = ["data", "processes", "tools", "team", "governance"] as const;

export type Dimension = (typeof DIMENSIONS)[number];
export type AnswerValue = 0 | 1 | 2 | 3;
export type DimensionAnswers = readonly [AnswerValue, AnswerValue, AnswerValue];
export type Answers = Readonly<Record<Dimension, DimensionAnswers>>;
export type Level = 1 | 2 | 3;

export interface DiagnosticScore {
  dimensions: Record<Dimension, number>;
  global: number;
  level: Level;
}

const QUESTIONS_PER_DIMENSION = 3;
const MAX_ANSWER = 3;
const MAX_DIMENSION_POINTS = QUESTIONS_PER_DIMENSION * MAX_ANSWER;

const LEVEL_2_MIN_GLOBAL = 40;
const LEVEL_3_MIN_GLOBAL = 70;
const LEVEL_3_MIN_GOVERNANCE = 60;

function assertScore(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new RangeError(`${name} must be an integer from 0 to 100, got ${value}`);
  }
}

export function scoreDimension(answers: DimensionAnswers): number {
  if (answers.length !== QUESTIONS_PER_DIMENSION) {
    throw new RangeError(
      `Expected ${QUESTIONS_PER_DIMENSION} answers per dimension, got ${answers.length}`,
    );
  }
  for (const answer of answers) {
    if (!Number.isInteger(answer) || answer < 0 || answer > MAX_ANSWER) {
      throw new RangeError(`Answer must be an integer from 0 to ${MAX_ANSWER}, got ${answer}`);
    }
  }
  const points = answers.reduce<number>((sum, answer) => sum + answer, 0);
  return Math.round((points / MAX_DIMENSION_POINTS) * 100);
}

export function getLevel(global: number, governance: number): Level {
  assertScore("Global score", global);
  assertScore("Governance score", governance);
  if (global >= LEVEL_3_MIN_GLOBAL && governance >= LEVEL_3_MIN_GOVERNANCE) return 3;
  if (global >= LEVEL_2_MIN_GLOBAL) return 2;
  return 1;
}

export function scoreDiagnostic(answers: Answers): DiagnosticScore {
  const dimensions = Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, scoreDimension(answers[dimension])]),
  ) as Record<Dimension, number>;
  const total = DIMENSIONS.reduce((sum, dimension) => sum + dimensions[dimension], 0);
  const global = Math.round(total / DIMENSIONS.length);
  return { dimensions, global, level: getLevel(global, dimensions.governance) };
}
