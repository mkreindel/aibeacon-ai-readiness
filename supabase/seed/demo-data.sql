-- Demo diagnostics for the read-only demo user. All data is fictional:
-- invented companies and @example.com emails. Idempotent: fixed ids, so running it
-- again inserts nothing new.
-- Scores and levels come from scoreDiagnostic; supabase/tests/seed.test.ts checks they match.

insert into public.diagnostics
  (id, created_at, company, contact_name, email, industry, company_size, answers, scores, level, consent, is_demo)
values
  ('de000000-0000-4000-8000-000000000001', '2026-10-01T14:05:00Z', 'Pinewood Builders Demo', 'Jordan Hayes', 'jordan.hayes@example.com', 'Construction', '11-50', '{"data":[1,0,1],"processes":[0,0,1],"tools":[1,0,0],"team":[0,1,0],"governance":[0,0,0]}'::jsonb, '{"dimensions":{"data":22,"processes":11,"tools":11,"team":11,"governance":0},"global":11}'::jsonb, 1, true, true),
  ('de000000-0000-4000-8000-000000000002', '2026-10-02T16:20:00Z', 'Harbor Light Bistro Demo', 'Sam Ortiz', 'sam.ortiz@example.com', 'Hospitality & food services', '1-10', '{"data":[1,1,1],"processes":[1,2,0],"tools":[1,1,1],"team":[1,1,0],"governance":[1,0,0]}'::jsonb, '{"dimensions":{"data":33,"processes":33,"tools":33,"team":22,"governance":11},"global":26}'::jsonb, 1, true, true),
  ('de000000-0000-4000-8000-000000000003', '2026-10-03T15:45:00Z', 'Bayou Freight Demo Co', 'Alex Rivera', 'alex.rivera@example.com', 'Transportation & logistics', '51-200', '{"data":[2,2,2],"processes":[2,1,2],"tools":[2,1,1],"team":[1,2,1],"governance":[1,1,1]}'::jsonb, '{"dimensions":{"data":67,"processes":56,"tools":44,"team":44,"governance":33},"global":49}'::jsonb, 2, true, true),
  ('de000000-0000-4000-8000-000000000004', '2026-10-04T13:10:00Z', 'Cypress Creek Realty Demo', 'Taylor Brooks', 'taylor.brooks@example.com', 'Real estate', '11-50', '{"data":[2,2,1],"processes":[2,2,2],"tools":[2,2,1],"team":[2,1,2],"governance":[1,2,1]}'::jsonb, '{"dimensions":{"data":56,"processes":67,"tools":56,"team":56,"governance":44},"global":56}'::jsonb, 2, true, true),
  ('de000000-0000-4000-8000-000000000005', '2026-10-05T17:30:00Z', 'Lone Star Widget Works Demo', 'Casey Nguyen', 'casey.nguyen@example.com', 'Manufacturing', '51-200', '{"data":[3,3,3],"processes":[3,3,2],"tools":[3,3,3],"team":[3,2,3],"governance":[1,1,2]}'::jsonb, '{"dimensions":{"data":100,"processes":89,"tools":100,"team":89,"governance":44},"global":84}'::jsonb, 2, true, true),
  ('de000000-0000-4000-8000-000000000006', '2026-10-06T14:50:00Z', 'Magnolia Family Clinic Demo', 'Morgan Patel', 'morgan.patel@example.com', 'Healthcare', '11-50', '{"data":[3,3,2],"processes":[3,2,3],"tools":[2,3,3],"team":[3,3,2],"governance":[3,3,2]}'::jsonb, '{"dimensions":{"data":89,"processes":89,"tools":89,"team":89,"governance":89},"global":89}'::jsonb, 3, true, true)
on conflict (id) do nothing;
