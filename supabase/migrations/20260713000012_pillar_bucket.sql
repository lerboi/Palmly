-- P9.T1 — day-pillar bucket in SQL (mirrors _shared/pillar.ts) so fortune lookup can map a user to
-- their bucket in-DB: `pillar_bucket(profiles.birth_date)`. The sexagenary DAY pillar (干支) is the
-- continuous 60-day cycle, computed from the Julian Day (to_char(d,'J')); anchor 2000-01-07 = 甲子
-- so (JDN + 49) mod 60 == 0 there. A null birth date → the generic bucket (fortunes still render).
-- Pure/immutable — safe for anyone to call (no data access).
create or replace function public.pillar_bucket(p_birth_date date)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  idx int;
  stems text[] := array['jia', 'yi', 'bing', 'ding', 'wu', 'ji', 'geng', 'xin', 'ren', 'gui'];
  branches text[] := array['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];
begin
  if p_birth_date is null then return 'generic'; end if;
  idx := ((to_char(p_birth_date, 'J')::bigint + 49) % 60)::int;
  return stems[idx % 10 + 1] || branches[idx % 12 + 1];
end;
$$;
