-- Fictional AI reports for the 6 demo diagnostics in demo-data.sql, so the demo user sees a
-- report in the panel. Written by hand from each row's industry, size, level and answers; no
-- model was called. Facts about the business come only from its answers; anything else is
-- worded as a suggestion. supabase/tests/seed.test.ts checks every report validates with
-- reportSchema. Idempotent: updates only these 6 demo rows, and only while report is null.

update public.diagnostics as d
set report = v.report
from (values
  -- Pinewood Builders Demo: Construction, 11-50, level 1, global 11.
  -- Scattered spreadsheets, reports not possible, nothing documented, most of the week is
  -- repetitive, free chat tools individually, no AI rules, no review, no measurement.
  ('de000000-0000-4000-8000-000000000001'::uuid, '{
    "summary": "Your information is scattered across spreadsheets and email, operations reports are not possible today and most of the week goes to repetitive tasks. There are no rules yet for AI tools, so the first gains come from organizing data and simple automation, not from AI.",
    "useCases": [
      {
        "title": "Digital daily job reports",
        "why": "Reports on operations are not possible today. A shared online form that fills a spreadsheet is classic automation, needs no AI and gives you data you can measure.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Turn your current daily job report into a free online form and pilot it on one job site for two weeks."
      },
      {
        "title": "Automatic invoice and permit reminders",
        "why": "With most of the week spent on repetitive tasks, simple reminders from a shared calendar or spreadsheet remove follow-up work with plain rules, no AI needed.",
        "effort": "low",
        "risk": "low",
        "firstStep": "List every permit and recurring invoice with its due date in one shared spreadsheet."
      },
      {
        "title": "Basic rules for free AI chat tools",
        "why": "Some people already use free AI chat tools on their own, with no rules and no review. A short list of what data must stay out of them lowers the risk at almost no cost.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Write five lines on what company and client data must never be pasted into AI chat tools."
      }
    ],
    "nextStep": "This week, pick one job site and replace its daily job report with a shared online form."
  }'::jsonb),

  -- Harbor Light Bistro Demo: Hospitality & food services, 1-10, level 1, global 26.
  -- Scattered spreadsheets, reports take days, no automation, copy and paste between tools,
  -- unwritten AI rules, no review of AI outputs, no measurement.
  ('de000000-0000-4000-8000-000000000002'::uuid, '{
    "summary": "Your information sits in scattered spreadsheets, reports take days of manual work and no process is automated yet. AI rules are unwritten and AI outputs are not reviewed, so simple automation of ordering and scheduling will help more than any chatbot.",
    "useCases": [
      {
        "title": "Inventory and reorder spreadsheet",
        "why": "Reports take days of manual work today. A spreadsheet with par levels and a reorder formula is classic automation and makes waste and stockouts easy to measure.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Write down par levels for your top 20 ingredients and count stock against them every Monday."
      },
      {
        "title": "Staff schedule from a template",
        "why": "Your tools are connected by copy and paste. If the weekly schedule is built by hand, a template or the scheduling feature of your point of sale system can handle it with rules, no AI needed.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Check whether your point of sale system already includes staff scheduling before buying anything new."
      },
      {
        "title": "AI drafts of menu descriptions, always reviewed",
        "why": "Menu and social media text is a good low risk use for AI, as long as a person reads every draft before it is published. AI outputs are not reviewed today, so this is a habit to start now.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Ask an AI assistant to draft descriptions for three dishes and edit them yourself before using them."
      }
    ],
    "nextStep": "This week, set par levels for your 20 most used ingredients in a shared spreadsheet."
  }'::jsonb),

  -- Bayou Freight Demo Co: Transportation & logistics, 51-200, level 2, global 49.
  -- Data in a few core systems, about half the week is repetitive, copy and paste between
  -- tools, paid AI licenses for some people, governance 33 (weakest): unwritten rules,
  -- review only sometimes, gut feeling instead of metrics.
  ('de000000-0000-4000-8000-000000000003'::uuid, '{
    "summary": "Your key data lives in a few core systems and some people already have paid AI tools. Governance is your weakest area: rules are unwritten and AI outputs are only reviewed sometimes, so agree on rules before scaling AI.",
    "useCases": [
      {
        "title": "Automated proof of delivery matching",
        "why": "About half of the week goes to repetitive tasks and tools are connected by copy and paste. Matching delivery receipts to invoices with rules between dispatch and billing needs no AI, and the hours saved are easy to measure.",
        "effort": "medium",
        "risk": "low",
        "firstStep": "Measure how many hours per week the billing team spends matching delivery receipts to invoices."
      },
      {
        "title": "AI extraction of data from shipping documents",
        "why": "Copying data between systems by hand is slow. AI document extraction fits, but a wrong weight or address is costly, so a person should check each extracted record at first.",
        "effort": "medium",
        "risk": "medium",
        "firstStep": "Collect 50 recent shipping documents and note which fields your team copies by hand."
      },
      {
        "title": "Written AI use policy",
        "why": "Rules for AI are unwritten and outputs are reviewed only sometimes. A one page policy on approved tools, data limits and review lowers the risk at almost no cost.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Draft a one page list of approved AI tools and the data that must never go into them."
      }
    ],
    "nextStep": "This week, write a one page AI use policy and share it with team leads."
  }'::jsonb),

  -- Cypress Creek Realty Demo: Real estate, 11-50, level 2, global 56.
  -- Most processes written down, a few automations, some integrations, most of the team tries
  -- AI, part-time AI owner, customer data updated occasionally by hand, governance 44 (lowest):
  -- unwritten rules, outputs usually reviewed, gut feeling instead of metrics.
  ('de000000-0000-4000-8000-000000000004'::uuid, '{
    "summary": "Most of your processes are written down, a few are automated and most of the team already tries AI. Governance is your lowest area: rules are unwritten and results are judged by gut feeling, so set clear rules before AI touches client data.",
    "useCases": [
      {
        "title": "Lead routing and follow-up rules in your CRM",
        "why": "Customer data is only updated occasionally by hand. CRM rules that assign new leads and create follow-up tasks are classic automation, with a clear metric: time to first contact.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Measure the average time between a new lead arriving and the first call."
      },
      {
        "title": "AI drafts of listing descriptions",
        "why": "Most of the team already tries AI. Listing drafts save time, and since outputs are usually but not always reviewed, make agent review a rule for every listing before it is published.",
        "effort": "low",
        "risk": "medium",
        "firstStep": "Have two agents draft five listings with an AI assistant and compare the time spent."
      },
      {
        "title": "Transaction checklist automation",
        "why": "Your processes are already written down, so a closing checklist with automatic reminders in your transaction software can prevent missed deadlines without AI.",
        "effort": "medium",
        "risk": "low",
        "firstStep": "Turn your written closing process into a checklist with a deadline for each step."
      }
    ],
    "nextStep": "This week, decide which client data agents may and may not put into AI tools."
  }'::jsonb),

  -- Lone Star Widget Works Demo: Manufacturing, 51-200, level 2 (capped by governance 44),
  -- global 84. Integrated data, company-wide AI tools, dedicated AI owner; governance:
  -- unwritten rules, outputs reviewed only sometimes, some metrics.
  ('de000000-0000-4000-8000-000000000005'::uuid, '{
    "summary": "Your data is integrated, AI tools are used company-wide and someone owns AI initiatives, so your overall score is high. Governance at 44 keeps you at level 2: rules are unwritten and AI outputs are reviewed only sometimes.",
    "useCases": [
      {
        "title": "AI governance and measurement plan",
        "why": "Governance is your bottleneck. Written rules, a review step and before and after metrics let you scale AI safely and prove its value.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Ask your AI owner to write down the current unwritten rules and the AI tools in use."
      },
      {
        "title": "Machine alerts before predictive maintenance",
        "why": "With integrated data, start with threshold alerts, which are classic automation, and add AI prediction only where thresholds miss failures. Downtime gives you a clear metric.",
        "effort": "medium",
        "risk": "medium",
        "firstStep": "Review last year of unplanned downtime and note which failures simple thresholds would have caught."
      },
      {
        "title": "AI first drafts of quality reports",
        "why": "Quality reports are recurring writing work. An AI draft saves time, and an engineer must sign off every report, which also fixes the review gap in your answers.",
        "effort": "medium",
        "risk": "medium",
        "firstStep": "Pick one recurring quality report and time how long it takes to write today."
      }
    ],
    "nextStep": "This week, turn your unwritten AI rules into a one page written policy."
  }'::jsonb),

  -- Magnolia Family Clinic Demo: Healthcare, 11-50, level 3, global 89.
  -- High in every area; written and enforced AI rules, outputs always reviewed by process,
  -- some metrics.
  ('de000000-0000-4000-8000-000000000006'::uuid, '{
    "summary": "Your clinic scores high in every area, with written and enforced AI rules and a review step for every output. The next step is to apply AI to internal administrative work where errors are easy to catch, not to clinical decisions.",
    "useCases": [
      {
        "title": "Appointment reminders and no-show tracking",
        "why": "Automated reminders from your scheduling system are classic automation, and the no-show rate gives you a before and after metric.",
        "effort": "low",
        "risk": "low",
        "firstStep": "Check your current no-show rate and whether your scheduling system can send reminders."
      },
      {
        "title": "AI review of insurance claims before submission",
        "why": "AI can flag claims that look inconsistent before they are sent. A wrong code is costly, so a coder reviews every flag, which fits your existing review process.",
        "effort": "medium",
        "risk": "medium",
        "firstStep": "Pull last quarter of denied claims and group them by denial reason."
      },
      {
        "title": "Internal policy assistant for staff",
        "why": "An AI assistant limited to your approved internal documents can answer staff policy questions faster. Keep it to internal questions, never patient care.",
        "effort": "medium",
        "risk": "medium",
        "firstStep": "Gather your current staff policies into one approved folder and remove outdated versions."
      }
    ],
    "nextStep": "This week, measure your no-show rate so you can track the effect of automated reminders."
  }'::jsonb)
) as v(id, report)
where d.id = v.id
  and d.is_demo
  and d.report is null;
