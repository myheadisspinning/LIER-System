-- seed patrol area for existing units (idempotent by name)
update public.dispatch_units d
set area = v.area
from (values
  ('Tanod Patrol Unit 2', 'Purok 6'),
  ('Tanod Patrol Unit 5', 'Luzon Ave'),
  ('Tanod Patrol Unit 1', 'Barangay Hall'),
  ('BFP Engine T-04', 'BFP Culiat Station'),
  ('Medical Ambulance M-02', 'Quezon City General Hospital'),
  ('Mobile Alpha (PNP)', 'QC Station 3')
) as v(name, area)
where d.name = v.name