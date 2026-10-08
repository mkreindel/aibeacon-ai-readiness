"use client";

import { useEffect, useRef, useState } from "react";
import { COMPANY_SIZES, INDUSTRIES, type CompanySize, type Industry } from "@/lib/company";
import { DIMENSION_LABELS, QUESTIONS } from "@/lib/questions";
import {
  DIMENSIONS,
  LEVEL_NAMES,
  scoreDiagnostic,
  type AnswerValue,
  type Answers,
  type DiagnosticScore,
  type Dimension,
} from "@/lib/scoring";

// Visitor flow from docs/spec.md, section 4. Nothing is persisted yet:
// contact data stays in memory and the score is computed in the browser.

type Step =
  | { kind: "company" }
  | { kind: "questions"; index: number }
  | { kind: "contact" }
  | { kind: "result"; score: DiagnosticScore };

type PartialAnswers = Record<Dimension, (AnswerValue | null)[]>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyAnswers = (): PartialAnswers =>
  Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, [null, null, null]])) as PartialAnswers;

function isComplete(values: (AnswerValue | null)[]): values is AnswerValue[] {
  return values.every((value) => value !== null);
}

function toAnswers(partial: PartialAnswers): Answers {
  return Object.fromEntries(
    DIMENSIONS.map((dimension) => {
      const values = partial[dimension];
      if (!isComplete(values)) throw new Error(`Missing answers for ${dimension}`);
      return [dimension, values];
    }),
  ) as unknown as Answers;
}

const buttonPrimary =
  "rounded-md bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
const buttonSecondary =
  "rounded-md border border-zinc-300 px-5 py-2.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";
const inputClass =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

export function DiagnosticFlow() {
  const [step, setStep] = useState<Step>({ kind: "company" });
  const [industry, setIndustry] = useState<Industry | "">("");
  const [size, setSize] = useState<CompanySize | null>(null);
  const [answers, setAnswers] = useState<PartialAnswers>(emptyAnswers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [consent, setConsent] = useState(false);

  // Move focus to the new screen's heading so keyboard and screen reader users follow along.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  function setAnswer(dimension: Dimension, questionIndex: number, value: AnswerValue) {
    setAnswers((current) => ({
      ...current,
      [dimension]: current[dimension].map((old, index) => (index === questionIndex ? value : old)),
    }));
  }

  if (step.kind === "company") {
    const canContinue = industry !== "" && size !== null;
    return (
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (canContinue) setStep({ kind: "questions", index: 0 });
        }}
      >
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          About your company
        </h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="industry" className="font-medium">
            Industry
          </label>
          <select
            id="industry"
            className={inputClass}
            value={industry}
            onChange={(event) => setIndustry(event.target.value as Industry | "")}
          >
            <option value="">Select your industry</option>
            {INDUSTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">Company size</legend>
          {COMPANY_SIZES.map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="radio"
                name="company-size"
                value={option}
                checked={size === option}
                onChange={() => setSize(option)}
              />
              {option} employees
            </label>
          ))}
        </fieldset>
        <div>
          <button type="submit" className={buttonPrimary} disabled={!canContinue}>
            Continue
          </button>
        </div>
      </form>
    );
  }

  if (step.kind === "questions") {
    const dimension = DIMENSIONS[step.index];
    const position = step.index + 1;
    const canContinue = isComplete(answers[dimension]);
    return (
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canContinue) return;
          setStep(
            step.index < DIMENSIONS.length - 1
              ? { kind: "questions", index: step.index + 1 }
              : { kind: "contact" },
          );
        }}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            Section {position} of {DIMENSIONS.length}
          </p>
          <div
            role="progressbar"
            aria-label="Progress"
            aria-valuemin={1}
            aria-valuemax={DIMENSIONS.length}
            aria-valuenow={position}
            className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          >
            <div
              className="h-full bg-zinc-900 dark:bg-zinc-100"
              style={{ width: `${(position / DIMENSIONS.length) * 100}%` }}
            />
          </div>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          {DIMENSION_LABELS[dimension]}
        </h2>
        {QUESTIONS[dimension].map((question, questionIndex) => (
          <fieldset key={question.id} className="flex flex-col gap-2">
            <legend className="mb-2 font-medium">{question.text}</legend>
            {question.options.map((option, value) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={question.id}
                  value={value}
                  checked={answers[dimension][questionIndex] === value}
                  onChange={() => setAnswer(dimension, questionIndex, value as AnswerValue)}
                />
                {option}
              </label>
            ))}
          </fieldset>
        ))}
        <div className="flex gap-3">
          <button
            type="button"
            className={buttonSecondary}
            onClick={() =>
              setStep(step.index === 0 ? { kind: "company" } : { kind: "questions", index: step.index - 1 })
            }
          >
            Back
          </button>
          <button type="submit" className={buttonPrimary} disabled={!canContinue}>
            Continue
          </button>
        </div>
      </form>
    );
  }

  if (step.kind === "contact") {
    const canSubmit =
      name.trim() !== "" && EMAIL_PATTERN.test(email.trim()) && company.trim() !== "" && consent;
    return (
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) setStep({ kind: "result", score: scoreDiagnostic(toAnswers(answers)) });
        }}
      >
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Almost done: tell us about you
        </h2>
        {(
          [
            ["name", "Your name", "text", "name", name, setName],
            ["email", "Work email", "email", "email", email, setEmail],
            ["company", "Company", "text", "organization", company, setCompany],
          ] as const
        ).map(([id, label, type, autoComplete, value, setValue]) => (
          <div key={id} className="flex flex-col gap-2">
            <label htmlFor={id} className="font-medium">
              {label}
            </label>
            <input
              id={id}
              type={type}
              autoComplete={autoComplete}
              className={inputClass}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
        ))}
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            I agree that AI Beacon stores my answers and contact details and may contact me about
            this diagnostic.
          </span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => setStep({ kind: "questions", index: DIMENSIONS.length - 1 })}
          >
            Back
          </button>
          <button type="submit" className={buttonPrimary} disabled={!canSubmit}>
            See my results
          </button>
        </div>
      </form>
    );
  }

  const { score } = step;
  return (
    <section className="flex flex-col gap-6">
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
        Level {score.level}: {LEVEL_NAMES[score.level]}
      </h2>
      <p className="text-lg">
        Overall score: {score.global} / 100
      </p>
      <ul aria-label="Score by area" className="flex flex-col gap-3">
        {DIMENSIONS.map((dimension) => (
          <li key={dimension} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>{DIMENSION_LABELS[dimension]}</span>
              <span>{score.dimensions[dimension]}</span>
            </div>
            <div aria-hidden="true" className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                style={{ width: `${score.dimensions[dimension]}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
