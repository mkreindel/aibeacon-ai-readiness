"use client";

import { useEffect, useRef, useState } from "react";
import { COMPANY_SIZES, INDUSTRIES, type CompanySize, type Industry } from "@/lib/company";
import { ReportView } from "@/components/report-view";
import { ScoreBars } from "@/components/score-bars";
import { DIMENSION_LABELS, QUESTIONS } from "@/lib/questions";
import type { Report } from "@/lib/report";
import {
  DIMENSIONS,
  LEVEL_NAMES,
  type AnswerValue,
  type Answers,
  type DiagnosticScore,
  type Dimension,
} from "@/lib/scoring";

// Visitor flow from docs/spec.md, section 4. The contact step posts to /api/diagnostics,
// which validates, scores, writes the AI report and saves the diagnostic; the result shows the
// server's score and report. The report may be null (spec, section 7): then a notice is shown.

type Step =
  | { kind: "company" }
  | { kind: "questions"; index: number }
  | { kind: "contact" }
  | { kind: "result"; score: DiagnosticScore; report: Report | null };

type PartialAnswers = Record<Dimension, (AnswerValue | null)[]>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMITED_MESSAGE =
  "You've sent several diagnostics in a short time. Please wait a while and try again.";
const GENERIC_ERROR_MESSAGE = "We couldn't save your diagnostic. Please try again.";
const NO_REPORT_MESSAGE =
  "We couldn't generate your personalized report right now. Your scores above are saved.";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          industry,
          companySize: size,
          answers: toAnswers(answers),
          contact: { name: name.trim(), email: email.trim(), company: company.trim() },
          consent,
        }),
      });
      if (response.status === 201) {
        const { score, report } = (await response.json()) as {
          score: DiagnosticScore;
          report: Report | null;
        };
        setStep({ kind: "result", score, report: report ?? null });
        return;
      }
      setSubmitError(response.status === 429 ? RATE_LIMITED_MESSAGE : GENERIC_ERROR_MESSAGE);
    } catch {
      setSubmitError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

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
          if (canSubmit && !submitting) void submit();
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
        {submitError && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {submitError}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            className={buttonSecondary}
            disabled={submitting}
            onClick={() => setStep({ kind: "questions", index: DIMENSIONS.length - 1 })}
          >
            Back
          </button>
          <button type="submit" className={buttonPrimary} disabled={!canSubmit || submitting}>
            {submitting ? "Preparing your report…" : "See my results"}
          </button>
        </div>
      </form>
    );
  }

  const { score, report } = step;
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Level {score.level}: {LEVEL_NAMES[score.level]}
        </h2>
        <p className="text-lg">
          Overall score: {score.global} / 100
        </p>
        <ScoreBars dimensions={score.dimensions} />
      </section>
      {report ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Your AI report</h2>
          <ReportView report={report} />
        </section>
      ) : (
        <p
          role="status"
          className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {NO_REPORT_MESSAGE}
        </p>
      )}
    </div>
  );
}
