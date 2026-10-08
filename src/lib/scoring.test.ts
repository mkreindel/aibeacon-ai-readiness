import { describe, expect, it } from "vitest";
import {
  getLevel,
  scoreDiagnostic,
  scoreDimension,
  type Answers,
  type DimensionAnswers,
} from "@/lib/scoring";

const all = (value: 0 | 1 | 2 | 3): DimensionAnswers => [value, value, value];

const answers = (overrides: Partial<Answers> = {}): Answers => ({
  data: all(0),
  processes: all(0),
  tools: all(0),
  team: all(0),
  governance: all(0),
  ...overrides,
});

describe("scoreDimension", () => {
  it("returns 0 when every answer is 0", () => {
    expect(scoreDimension([0, 0, 0])).toBe(0);
  });

  it("returns 100 when every answer is 3", () => {
    expect(scoreDimension([3, 3, 3])).toBe(100);
  });

  it("rounds down 33.33 to 33", () => {
    expect(scoreDimension([1, 1, 1])).toBe(33);
  });

  it("rounds up 55.56 to 56", () => {
    expect(scoreDimension([2, 2, 1])).toBe(56);
  });

  it("rounds up 88.89 to 89", () => {
    expect(scoreDimension([3, 3, 2])).toBe(89);
  });

  it.each([[[4, 0, 0]], [[-1, 0, 0]], [[1.5, 0, 0]]])(
    "throws on an answer outside 0 to 3: %j",
    (input) => {
      expect(() => scoreDimension(input as unknown as DimensionAnswers)).toThrow(RangeError);
    },
  );

  it("throws when a dimension does not have exactly 3 answers", () => {
    expect(() => scoreDimension([1, 1] as unknown as DimensionAnswers)).toThrow(RangeError);
  });
});

describe("getLevel", () => {
  it("is level 1 at global 39 (upper edge of level 1)", () => {
    expect(getLevel(39, 100)).toBe(1);
  });

  it("is level 2 at global 40 (lower edge of level 2)", () => {
    expect(getLevel(40, 100)).toBe(2);
  });

  it("is level 2 at global 69 (upper edge of level 2)", () => {
    expect(getLevel(69, 100)).toBe(2);
  });

  it("is level 3 at global 70 with governance 60", () => {
    expect(getLevel(70, 60)).toBe(3);
  });

  it("is level 2 at global 70 with governance 59", () => {
    expect(getLevel(70, 59)).toBe(2);
  });

  it("is level 2 at global 100 when governance is below 60", () => {
    expect(getLevel(100, 59)).toBe(2);
  });

  it("is level 1 at global 0", () => {
    expect(getLevel(0, 0)).toBe(1);
  });

  it.each([
    [-1, 50],
    [101, 50],
    [50.5, 50],
    [50, -1],
    [50, 101],
  ])("throws on a score outside the integers 0 to 100: global %d, governance %d", (global, governance) => {
    expect(() => getLevel(global, governance)).toThrow(RangeError);
  });
});

describe("scoreDiagnostic", () => {
  it("scores all-zero answers as 0 everywhere and level 1", () => {
    expect(scoreDiagnostic(answers())).toEqual({
      dimensions: { data: 0, processes: 0, tools: 0, team: 0, governance: 0 },
      global: 0,
      level: 1,
    });
  });

  it("scores all-three answers as 100 everywhere and level 3", () => {
    const all3 = answers({
      data: all(3),
      processes: all(3),
      tools: all(3),
      team: all(3),
      governance: all(3),
    });
    expect(scoreDiagnostic(all3)).toEqual({
      dimensions: { data: 100, processes: 100, tools: 100, team: 100, governance: 100 },
      global: 100,
      level: 3,
    });
  });

  it("keeps level 2 when the global is high but governance is below 60", () => {
    const result = scoreDiagnostic(
      answers({
        data: all(3),
        processes: all(3),
        tools: all(3),
        team: all(3),
        governance: [2, 2, 1],
      }),
    );
    // (100 * 4 + 56) / 5 = 91.2
    expect(result.global).toBe(91);
    expect(result.dimensions.governance).toBe(56);
    expect(result.level).toBe(2);
  });

  it("reaches level 3 with the lowest governance answers that score 60 or more", () => {
    const result = scoreDiagnostic(
      answers({
        data: all(3),
        processes: all(3),
        tools: all(3),
        team: all(3),
        governance: [2, 2, 2],
      }),
    );
    expect(result.dimensions.governance).toBe(67);
    expect(result.level).toBe(3);
  });

  it("averages the rounded dimension scores", () => {
    // 33, 33, 33, 33, 56 -> 188 / 5 = 37.6 -> 38
    const result = scoreDiagnostic(
      answers({
        data: all(1),
        processes: all(1),
        tools: all(1),
        team: all(1),
        governance: [2, 2, 1],
      }),
    );
    expect(result.global).toBe(38);
    expect(result.level).toBe(1);
  });

  it("returns the same result for the same answers and does not mutate them", () => {
    const input = answers({ data: [1, 2, 3], governance: [3, 0, 2] });
    const snapshot = structuredClone(input);
    expect(scoreDiagnostic(input)).toEqual(scoreDiagnostic(input));
    expect(input).toEqual(snapshot);
  });
});
