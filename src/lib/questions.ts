// Question bank. Source of truth: docs/spec.md, section 6.
// Each option's value is its index (0 to 3), matching the scoring model.

import type { Dimension } from "@/lib/scoring";

export interface Question {
  id: string;
  text: string;
  options: readonly [string, string, string, string];
}

export type DimensionQuestions = readonly [Question, Question, Question];

export const DIMENSION_LABELS: Readonly<Record<Dimension, string>> = {
  data: "Data",
  processes: "Processes",
  tools: "Tools",
  team: "Team",
  governance: "Governance",
};

export const QUESTIONS: Readonly<Record<Dimension, DimensionQuestions>> = {
  data: [
    {
      id: "q1",
      text: "Where does your key business information live?",
      options: [
        "Paper or people's heads",
        "Scattered spreadsheets and email",
        "A few core systems",
        "Integrated systems with a single source of truth",
      ],
    },
    {
      id: "q2",
      text: "How easy is it to get a report on sales or operations?",
      options: ["Not possible", "Takes days of manual work", "A few hours", "Available on demand"],
    },
    {
      id: "q3",
      text: "How is customer data kept up to date?",
      options: ["It isn't", "Occasionally by hand", "Regularly by a person", "Automatically"],
    },
  ],
  processes: [
    {
      id: "q4",
      text: "How documented are your main processes?",
      options: ["Not documented", "Some notes", "Most are written down", "Documented and reviewed"],
    },
    {
      id: "q5",
      text: "How much of your team's week goes to repetitive tasks?",
      options: ["Most of it", "About half", "A quarter", "Very little"],
    },
    {
      id: "q6",
      text: "Have you automated any process (even without AI)?",
      options: ["No", "Tried once", "A few", "Many, maintained"],
    },
  ],
  tools: [
    {
      id: "q7",
      text: "Which AI tools does your team use today?",
      options: [
        "None",
        "Free chat tools, individually",
        "Paid licenses for some people",
        "Company-wide tools",
      ],
    },
    {
      id: "q8",
      text: "Are your tools connected to each other?",
      options: ["No", "Copy and paste", "Some integrations", "Most are integrated"],
    },
    {
      id: "q9",
      text: "Do you pay for AI tools at company level?",
      options: [
        "No",
        "Individuals expense them",
        "One team plan",
        "Company plan with admin control",
      ],
    },
  ],
  team: [
    {
      id: "q10",
      text: "How comfortable is your team with AI?",
      options: ["Avoids it", "A few curious people", "Most try it", "It is part of daily work"],
    },
    {
      id: "q11",
      text: "Has anyone received AI training?",
      options: ["No", "Self-taught only", "Some formal training", "Ongoing training plan"],
    },
    {
      id: "q12",
      text: "Is someone responsible for AI initiatives?",
      options: ["No", "Informally", "Part-time owner", "Dedicated owner"],
    },
  ],
  governance: [
    {
      id: "q13",
      text: "Do you have rules on what data can go into AI tools?",
      options: ["No", "Unwritten", "Written policy", "Written and enforced"],
    },
    {
      id: "q14",
      text: "Does a person review AI outputs before they reach customers?",
      options: ["No review", "Sometimes", "Usually", "Always, by process"],
    },
    {
      id: "q15",
      text: "Do you measure results of AI or automation projects?",
      options: ["No", "Gut feeling", "Some metrics", "Before-and-after metrics"],
    },
  ],
};
