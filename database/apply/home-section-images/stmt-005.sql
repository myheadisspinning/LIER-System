insert into public.home_section_images (section, slot_key, label, image_url) values
  ('services', 'report_incident', 'Report an Incident', '/image/culiat-brgy.jpg'),
  ('services', 'emergency_hotline', 'Emergency Hotline', '/image/tandangsora.jfif'),
  ('services', 'police_assistance', 'Police Assistance', '/image/barangayhalltandangsora.jfif'),
  ('services', 'contact_barangay', 'Contact Barangay', '/image/tandangsorashrine.jpg'),
  ('guides', 'elders_guide', 'Elders'' Guide: Navigating the Portal', '/image/culiat-brgy.jpg'),
  ('guides', 'safety_protocols', 'Public Safety & Protocols', '/image/tandangsora.jfif'),
  ('guides', 'resilient_community', 'Building a Resilient Community', '/image/tandangsorashrine.jpg')
on conflict (section, slot_key) do update set image_url = excluded.image_url;
