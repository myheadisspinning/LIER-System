-- ============================================================================
-- fallback_rules reseed
-- Fixes: previous seed stored non-canonical category labels ('Others', 'Crime',
-- 'Medical') which classify-incident's normalizeCategory maps to
-- 'Other/Uncategorized'. This seed uses the canonical categories exactly as
-- the edge function expects, adds Public Disturbance / Traffic / Missing
-- Person / Animal / Infrastructure rules, and gives sane priorities.
--
-- Keyword matching in the rule engine is a naive substring match, so NO short,
-- ambiguous keywords (siga, bara, cat, dog) are included here.
--
-- Idempotent: wipes fallback_rules then re-inserts. Run in the Supabase SQL
-- editor (or: supabase db execute), takes effect immediately (no redeploy).
-- ============================================================================

delete from public.fallback_rules;

insert into public.fallback_rules (keywords, category, action, priority)
select v.keywords, v.category, v.action, v.priority
from (values
  -- ------------------------------------------------------------- Crime & Theft
  (array['saksak', 'saksakin', 'saksakan', 'sinaksak', 'nasaksak', 'pananaksak', 'nanaksak', 'pamamaril', 'namaril', 'barilin', 'binaril', 'maririnig na putok', 'stab', 'stabbing', 'stabbed', 'shoot', 'shooting', 'shot', 'gunshot', 'knife', 'weapon', 'armed', 'gun', 'baril', 'patalim', 'kutsilyo', 'armas'], 'Crime & Theft', 'Emergency', 'CRITICAL'),
  (array['patay', 'pinatay', 'patayan', 'pumatay', 'nasawi', 'natagpuang patay', 'kill', 'killed', 'murder', 'homicide', 'dead body', 'namatay', 'bangkay', 'natagpuang bangkay', 'cadaver', 'deceased', 'patay na tao', 'walang buhay'], 'Crime & Theft', 'Emergency', 'CRITICAL'),
  (array['dinukot', 'nangikidnap', 'kinarnap', 'kidnap', 'kidnapping', 'abducted', 'carnap', 'carnapping', 'hijack'], 'Crime & Theft', 'Emergency', 'CRITICAL'),
  (array['nakaw', 'ninakaw', 'ninanakaw', 'magnanakaw', 'pagnanakaw', 'holdap', 'snatcher', 'mandurukot', 'kawatan', 'stolen', 'theft', 'robbery', 'stole', 'shoplifting', 'burglary', 'pickpocket'], 'Crime & Theft', 'Dispatch', 'HIGH'),
  (array['gulpi', 'ginulpi', 'binugbog', 'bugbog', 'bugbugan', 'sinalakay', 'maul', 'mauling', 'assault', 'attacked', 'nanakit', 'sinaktan'], 'Crime & Theft', 'Dispatch', 'HIGH'),
  (array['droga', 'ipinagbabawal na gamot', 'drugs', 'drug', 'shabu', 'pusher'], 'Crime & Theft', 'Dispatch', 'HIGH'),
  (array['basag', 'sinira', 'vandalism', 'vandal', 'graffiti', 'sinirang pag-aari'], 'Crime & Theft', 'Investigate', 'MEDIUM'),
  -- -------------------------------------------------------------- Fire Hazard
  (array['sunog', 'apoy', 'nasusunog', 'nagliliyab', 'usok', 'nagniningas', 'nagsusunog', 'umuusok', 'fire', 'smoke', 'burning', 'flames', 'blaze'], 'Fire Hazard', 'Emergency', 'CRITICAL'),
  (array['sinunog', 'sinusunog', 'panununog', 'arson'], 'Fire Hazard', 'Emergency', 'CRITICAL'),
  (array['pagsabog', 'sumabog', 'bomba', 'tagas ng gas', 'gasolina', 'nakuryente', 'explosion', 'exploded', 'bomb', 'blast', 'gas leak', 'fuel', 'gasoline', 'short circuit', 'electrical fire'], 'Fire Hazard', 'Emergency', 'CRITICAL'),
  -- --------------------------------------------------------- Medical Emergency
  (array['sugatan', 'nasugatan', 'dugo', 'dumudugo', 'walang malay', 'himatay', 'nahimatay', 'nasaktan', 'atake', 'malubhang sugat', 'atake sa puso', 'high blood', 'kombulsyon', 'hirap huminga', 'pagsusuka', 'injured', 'wound', 'bleeding', 'unconscious', 'hurt', 'heart attack', 'stroke', 'seizure', 'convulsion', 'emergency'], 'Medical Emergency', 'Emergency', 'CRITICAL'),
  (array['kagat', 'nakagat', 'kagat ng aso', 'kagat ng pusa', 'kagat ng ahas', 'tinuka', 'dog bite', 'snake bite', 'bite', 'hika', 'atake ng hika', 'asthma', 'buntis', 'manganganak', 'nanganganak', 'nanganak', 'pregnant', 'labor', 'giving birth', 'nalason', 'pagkalason', 'lason', 'poison', 'poisoning', 'overdose'], 'Medical Emergency', 'Dispatch', 'HIGH'),
  -- ---------------------------------------------------------- Traffic Incident
  (array['aksidente', 'naaksidente', 'banggaan', 'nabangga', 'nabanggaan', 'natumba ang sasakyan', 'aksidente sa kalsada', 'accident', 'vehicular accident', 'collision', 'crash', 'car crash', 'traffic jam', 'gridlock', 'road block', 'harang sa daan', 'counterflow', 'nasagasaan', 'trapiko', 'traffic'], 'Traffic Incident', 'Dispatch', 'MEDIUM'),
  -- ---------------------------------------------------------- Natural Disaster
  (array['baha', 'bumaha', 'pagbaha', 'flash flood', 'storm surge', 'pagguho', 'gumuho', 'natabunan', 'lindol', 'yumanig', 'bagyo', 'malakas na ulan', 'flood', 'landslide', 'earthquake', 'storm', 'tsunami', 'heavy rain'], 'Natural Disaster', 'Dispatch', 'HIGH'),
  -- ------------------------------------------------------------- Infrastructure
  (array['brownout', 'power outage', 'no electricity', 'walang kuryente', 'sira ng kuryente', 'walang tubig', 'sirang tubo', 'sirang kable', 'sirang poste', 'sirang ilaw', 'sirang tulay', 'lubak', 'butas sa kalsada', 'manhole', 'baradong kanal', 'downed wire', 'fallen tree', 'natumbang puno', 'bumagsak na puno'], 'Infrastructure', 'Dispatch', 'MEDIUM'),
  -- ------------------------------------------------------- Public Disturbance
  (array['sigaw', 'sumisigaw', 'nagsisigaw', 'sigawan', 'nagsisigawan', 'away', 'awayan', 'nag-aaway', 'nagkakagulo', 'gulo', 'sagupaan', 'suntukan', 'bugbugan', 'sabunutan', 'rambol', 'rally', 'protesta'], 'Public Disturbance', 'Dispatch', 'HIGH'),
  (array['ingay', 'maingay', 'nag-iingay', 'videoke', 'karaoke', 'sound system', 'lasing', 'lasingan', 'inuman', 'alak', 'istambay', 'tambay', 'maingay sa gabi', 'noise', 'loud', 'disturbance', 'loitering', 'nakakaistorbo', 'nakakagambala'], 'Public Disturbance', 'Investigate', 'MEDIUM'),
  -- ------------------------------------------------------------- Missing Person
  (array['nawawala', 'nawawalang tao', 'nawawalang bata', 'missing', 'lost child', 'lost person', 'hindi mahanap', 'hindi makita', 'hindi na umuwi', 'hindi dumarating'], 'Missing Person', 'Dispatch', 'HIGH'),
  -- ------------------------------------------------------------ Animal Incident
  (array['aso', 'pusa', 'ahas', 'daga', 'ligaw na aso', 'ligaw na pusa', 'monkey', 'unggoy', 'buwaya', 'tahol', 'maingay ang aso', 'rabid', 'rabies', 'stray dog', 'stray animal', 'aggressive dog', 'wild animal'], 'Animal Incident', 'Dispatch', 'MEDIUM')
) as v(keywords, category, action, priority);

-- Verify: expect 18 rules, all with canonical category labels
select category, priority, action, count(*) as n
from public.fallback_rules
group by category, priority, action
order by category, priority;