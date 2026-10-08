// Company data options. Source of truth: docs/spec.md, section 4.

export const INDUSTRIES = [
  "Construction",
  "Manufacturing",
  "Wholesale & distribution",
  "Retail",
  "Transportation & logistics",
  "Energy (oil & gas)",
  "Professional services (legal, accounting, consulting)",
  "Healthcare",
  "Real estate",
  "Hospitality & food services",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200"] as const;

export type CompanySize = (typeof COMPANY_SIZES)[number];
