-- ERD GEA: konten menyediakan dua kartu UI; tidak ada duplikasi baris untuk jenis kartu.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.zona (
  id_zona uuid primary key default gen_random_uuid(),
  nama text not null check (length(btrim(nama)) > 0),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius double precision not null check (radius > 0 and radius < 'Infinity'::float8)
);
comment on column public.zona.radius is 'Meter; radius zona/checkpoint, bukan otomatis batas museum.';

create table public.zona_keyword (
  id_zona uuid not null references public.zona on delete cascade,
  keyword text not null check (length(btrim(keyword)) > 0),
  primary key (id_zona, keyword)
);

create table public.poi (
  id_poi uuid primary key default gen_random_uuid(),
  id_zona uuid not null references public.zona,
  nama text not null check (length(btrim(nama)) > 0),
  path_foto text not null check (length(btrim(path_foto)) > 0),
  denah_x double precision not null check (denah_x >= 0 and denah_x < 'Infinity'::float8),
  denah_y double precision not null check (denah_y >= 0 and denah_y < 'Infinity'::float8),
  prioritas integer not null check (prioritas >= 0),
  estimasi_durasi integer not null check (estimasi_durasi > 0),
  is_published boolean not null default false
);
comment on column public.poi.estimasi_durasi is 'Estimasi durasi kunjungan dalam menit.';

create table public.poi_keyword (
  id_poi uuid not null references public.poi on delete cascade,
  keyword text not null check (length(btrim(keyword)) > 0),
  primary key (id_poi, keyword)
);

create table public.memiliki_jarak (
  id_poi_asal uuid not null references public.poi on delete cascade,
  id_poi_tujuan uuid not null references public.poi on delete cascade,
  jarak double precision not null check (jarak >= 0 and jarak < 'Infinity'::float8),
  primary key (id_poi_asal, id_poi_tujuan),
  check (id_poi_asal <> id_poi_tujuan)
);

create table public.konten (
  id_poi uuid not null references public.poi on delete cascade,
  bahasa text not null check (bahasa in ('id', 'en')),
  profil text not null check (profil in ('umum', 'pelajar')),
  teks_cerita text not null check (
    length(btrim(teks_cerita)) > 0 and
    cardinality(regexp_split_to_array(btrim(teks_cerita), '\s+')) <= 100
  ),
  path_audio text not null check (length(btrim(path_audio)) > 0),
  durasi_audio integer not null check (durasi_audio between 30 and 90),
  primary key (id_poi, bahasa, profil)
);
comment on column public.konten.durasi_audio is 'Detik; sprint mewajibkan audio 30-90 detik.';

create table public.quest (
  id_quest uuid primary key default gen_random_uuid(),
  id_poi uuid not null unique references public.poi on delete cascade,
  tipe_quest text not null check (tipe_quest = 'pilgan')
);

create table public.quest_teks (
  id_quest uuid not null references public.quest on delete cascade,
  bahasa text not null check (bahasa in ('id', 'en')),
  profil text not null check (profil in ('umum', 'pelajar')),
  instruksi text not null check (length(btrim(instruksi)) > 0),
  pertanyaan text not null check (length(btrim(pertanyaan)) > 0),
  hint text not null check (length(btrim(hint)) > 0),
  primary key (id_quest, bahasa, profil)
);

create table public.quest_opsi (
  id_quest uuid not null references public.quest on delete cascade,
  label_opsi text not null check (label_opsi in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  primary key (id_quest, label_opsi)
);
create unique index quest_satu_kunci on public.quest_opsi (id_quest) where is_correct;

create table public.quest_opsi_text (
  id_quest uuid not null,
  label_opsi text not null,
  bahasa text not null check (bahasa in ('id', 'en')),
  teks_opsi text not null check (length(btrim(teks_opsi)) > 0),
  primary key (id_quest, label_opsi, bahasa),
  foreign key (id_quest, label_opsi) references public.quest_opsi on delete cascade
);

create table public.sesi_kunjungan (
  id_sesi uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  id_zona uuid not null references public.zona,
  bahasa text not null check (bahasa in ('id', 'en')),
  profil text not null check (profil in ('umum', 'pelajar')),
  eyes_free_aktif boolean not null default false,
  verification_method text not null check (verification_method in ('gps', 'entrance_qr')),
  status text not null default 'aktif' check (status in ('aktif', 'selesai')),
  start_time timestamptz not null default now(),
  end_time timestamptz
);
create index sesi_pemilik on public.sesi_kunjungan (user_id);

create table public.menampilkan_kartu (
  id_sesi uuid not null references public.sesi_kunjungan on delete cascade,
  id_poi uuid not null references public.poi,
  status_kartu text not null check (status_kartu in ('sedang_tampil', 'ditutup')),
  waktu_ditutup timestamptz,
  primary key (id_sesi, id_poi)
);

create table public.mengerjakan (
  id_sesi uuid not null references public.sesi_kunjungan on delete cascade,
  id_quest uuid not null references public.quest,
  jumlah_percobaan integer not null check (jumlah_percobaan > 0),
  hint_dipakai boolean not null,
  answer_correct boolean not null,
  label_opsi_terakhir text not null,
  photo_taken boolean not null default false,
  photo_path text,
  waktu_foto timestamptz,
  primary key (id_sesi, id_quest),
  foreign key (id_quest, label_opsi_terakhir) references public.quest_opsi
);

create table private.qr_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  scope text not null check (scope in ('entrance', 'poi')),
  id_zona uuid references public.zona,
  id_poi uuid references public.poi,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (
    (scope = 'entrance' and id_zona is not null and id_poi is null) or
    (scope = 'poi' and id_poi is not null and id_zona is null)
  )
);

create table private.poi_verification (
  id_sesi uuid not null references public.sesi_kunjungan on delete cascade,
  id_poi uuid not null references public.poi,
  expires_at timestamptz not null,
  primary key (id_sesi, id_poi)
);

create table private.quest_attempts (
  id_sesi uuid not null references public.sesi_kunjungan on delete cascade,
  request_id uuid not null,
  id_quest uuid not null references public.quest,
  label_opsi text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (id_sesi, request_id)
);

-- Semua akses aplikasi melalui Edge Function; bearer user tidak boleh membaca kunci
-- atau menulis hasil penilaian langsung lewat Data API.
do $$
declare table_name text;
begin
  for table_name in
    select tablename from pg_tables where schemaname in ('public', 'private')
      and tablename in ('zona', 'zona_keyword', 'poi', 'poi_keyword', 'memiliki_jarak',
        'konten', 'quest', 'quest_teks', 'quest_opsi', 'quest_opsi_text', 'sesi_kunjungan',
        'menampilkan_kartu', 'mengerjakan', 'qr_tokens', 'poi_verification', 'quest_attempts')
  loop
    execute format('alter table %I.%I enable row level security',
      case when table_name in ('qr_tokens','poi_verification','quest_attempts')
        then 'private' else 'public' end, table_name);
  end loop;
end $$;

do $$
declare target text;
begin
  foreach target in array array['zona', 'zona_keyword', 'poi', 'poi_keyword',
    'memiliki_jarak', 'konten', 'quest', 'quest_teks', 'quest_opsi', 'quest_opsi_text',
    'sesi_kunjungan', 'menampilkan_kartu', 'mengerjakan']
  loop
    execute format('revoke all on public.%I from public, anon, authenticated', target);
    execute format('grant all on public.%I to service_role', target);
  end loop;
end $$;
revoke all on all tables in schema private from public, anon, authenticated;
grant all on all tables in schema private to service_role;

-- Seorang pengunjung hanya dapat menggunakan sesi miliknya yang masih aktif.
create function private.require_session(p_user_id uuid, p_id_sesi uuid)
returns public.sesi_kunjungan language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan;
begin
  select * into visit from public.sesi_kunjungan
    where id_sesi = p_id_sesi and user_id = p_user_id for update;
  if not found then
    raise sqlstate 'PT404' using message = 'SESSION_NOT_FOUND';
  end if;
  if visit.status <> 'aktif' then
    raise sqlstate 'PT409' using message = 'SESSION_FINISHED';
  end if;
  return visit;
end $$;

create function public.buat_sesi_gps(
  p_user_id uuid, p_id_sesi uuid, p_id_zona uuid, p_bahasa text, p_profil text
) returns jsonb language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan;
begin
  insert into public.sesi_kunjungan
    (id_sesi, user_id, id_zona, bahasa, profil, verification_method)
    values (p_id_sesi, p_user_id, p_id_zona, p_bahasa, p_profil, 'gps')
    on conflict (id_sesi) do nothing;
  visit := private.require_session(p_user_id, p_id_sesi);
  if visit.id_zona <> p_id_zona or visit.bahasa <> p_bahasa or visit.profil <> p_profil
    or visit.verification_method <> 'gps' then
    raise sqlstate 'PT409' using message = 'SESSION_REQUEST_CONFLICT';
  end if;
  return to_jsonb(visit) - 'user_id';
end $$;

create function public.buat_sesi_qr(
  p_user_id uuid, p_id_sesi uuid, p_token_hash text, p_bahasa text, p_profil text
) returns jsonb language plpgsql set search_path = '' as $$
declare qr private.qr_tokens; visit public.sesi_kunjungan;
begin
  select * into qr from private.qr_tokens where token_hash = p_token_hash
    and scope = 'entrance' and revoked_at is null and expires_at > now();
  if not found then raise sqlstate 'PT403' using message = 'ENTRANCE_QR_INVALID'; end if;
  insert into public.sesi_kunjungan
    (id_sesi, user_id, id_zona, bahasa, profil, verification_method)
    values (p_id_sesi, p_user_id, qr.id_zona, p_bahasa, p_profil, 'entrance_qr')
    on conflict (id_sesi) do nothing;
  visit := private.require_session(p_user_id, p_id_sesi);
  if visit.id_zona <> qr.id_zona or visit.bahasa <> p_bahasa or visit.profil <> p_profil
    or visit.verification_method <> 'entrance_qr' then
    raise sqlstate 'PT409' using message = 'SESSION_REQUEST_CONFLICT';
  end if;
  return to_jsonb(visit) - 'user_id';
end $$;

create function public.verifikasi_qr_poi(p_user_id uuid, p_id_sesi uuid, p_token_hash text)
returns jsonb language plpgsql set search_path = '' as $$
declare qr private.qr_tokens; valid_until timestamptz;
begin
  perform private.require_session(p_user_id, p_id_sesi);
  select q.* into qr from private.qr_tokens q join public.poi p on p.id_poi = q.id_poi
    where q.token_hash = p_token_hash and q.scope = 'poi' and q.revoked_at is null
      and q.expires_at > now() and p.is_published;
  if not found then raise sqlstate 'PT403' using message = 'POI_QR_INVALID'; end if;
  valid_until := least(qr.expires_at, now() + interval '15 minutes');
  insert into private.poi_verification (id_sesi, id_poi, expires_at)
    values (p_id_sesi, qr.id_poi, valid_until)
    on conflict (id_sesi, id_poi) do update set expires_at = excluded.expires_at;
  return jsonb_build_object('idPoi', qr.id_poi, 'verified', true, 'expiresAt', valid_until);
end $$;

create function public.jawab_quest(
  p_user_id uuid, p_id_sesi uuid, p_id_quest uuid, p_label_opsi text, p_request_id uuid
) returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan; attempt private.quest_attempts; progress public.mengerjakan;
  question public.quest; correct boolean; hint_text text; result jsonb;
begin
  visit := private.require_session(p_user_id, p_id_sesi);
  select * into attempt from private.quest_attempts
    where id_sesi = p_id_sesi and request_id = p_request_id;
  if found then
    if attempt.id_quest <> p_id_quest or attempt.label_opsi <> p_label_opsi then
      raise sqlstate 'PT409' using message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return attempt.response;
  end if;
  select q.* into question from public.quest q join public.poi p using (id_poi)
    where q.id_quest = p_id_quest and p.is_published;
  if not found then raise sqlstate 'PT404' using message = 'QUEST_NOT_FOUND'; end if;
  if not exists (select 1 from private.poi_verification
    where id_sesi = p_id_sesi and id_poi = question.id_poi and expires_at > now()) then
    raise sqlstate 'PT403' using message = 'CHECKPOINT_VERIFICATION_REQUIRED';
  end if;
  select is_correct into correct from public.quest_opsi
    where id_quest = p_id_quest and label_opsi = p_label_opsi;
  if not found then raise sqlstate 'PT400' using message = 'OPTION_NOT_FOUND'; end if;
  select * into progress from public.mengerjakan
    where id_sesi = p_id_sesi and id_quest = p_id_quest;
  if found and progress.answer_correct then
    raise sqlstate 'PT409' using message = 'QUEST_ALREADY_COMPLETED';
  end if;
  select hint into hint_text from public.quest_teks
    where id_quest = p_id_quest and bahasa = visit.bahasa and profil = visit.profil;
  if not found then raise sqlstate 'PT409' using message = 'QUEST_VARIANT_NOT_AVAILABLE'; end if;
  insert into public.mengerjakan
    (id_sesi, id_quest, jumlah_percobaan, hint_dipakai, answer_correct, label_opsi_terakhir)
    values (p_id_sesi, p_id_quest, 1, not correct, correct, p_label_opsi)
    on conflict (id_sesi, id_quest) do update set
      jumlah_percobaan = public.mengerjakan.jumlah_percobaan + 1,
      hint_dipakai = public.mengerjakan.hint_dipakai or not correct,
      answer_correct = correct, label_opsi_terakhir = p_label_opsi
    returning * into progress;
  result := jsonb_build_object('idQuest', p_id_quest, 'idPoi', question.id_poi,
    'answerCorrect', correct, 'attemptCount', progress.jumlah_percobaan,
    'completed', correct, 'hint', case when correct then null else hint_text end);
  insert into private.quest_attempts (id_sesi, request_id, id_quest, label_opsi, response)
    values (p_id_sesi, p_request_id, p_id_quest, p_label_opsi, result);
  return result;
end $$;

create function public.tutup_kartu(p_user_id uuid, p_id_sesi uuid, p_id_poi uuid)
returns jsonb language plpgsql set search_path = '' as $$
begin
  perform private.require_session(p_user_id, p_id_sesi);
  if not exists (select 1 from public.poi where id_poi = p_id_poi and is_published) then
    raise sqlstate 'PT404' using message = 'POI_NOT_FOUND';
  end if;
  insert into public.menampilkan_kartu (id_sesi, id_poi, status_kartu, waktu_ditutup)
    values (p_id_sesi, p_id_poi, 'ditutup', now())
    on conflict (id_sesi, id_poi) do nothing;
  return jsonb_build_object('idPoi', p_id_poi, 'statusKartu', 'ditutup');
end $$;

create function public.progres_kunjungan(p_user_id uuid, p_id_sesi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan;
begin
  visit := private.require_session(p_user_id, p_id_sesi);
  return jsonb_build_object('session', to_jsonb(visit) - 'user_id',
    'cards', coalesce((select jsonb_agg(to_jsonb(k)) from public.menampilkan_kartu k
      where k.id_sesi = p_id_sesi), '[]'::jsonb),
    'quests', coalesce((select jsonb_agg(to_jsonb(m)) from public.mengerjakan m
      where m.id_sesi = p_id_sesi), '[]'::jsonb));
end $$;

-- Fungsi internal hanya bisa dipanggil service-role di Edge, tidak oleh publishable key.
do $$
declare target regprocedure;
begin
  for target in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('buat_sesi_gps', 'buat_sesi_qr',
      'verifikasi_qr_poi', 'jawab_quest', 'tutup_kartu', 'progres_kunjungan')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', target);
    execute format('grant execute on function %s to service_role', target);
  end loop;
end $$;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
