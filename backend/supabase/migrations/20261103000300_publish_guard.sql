-- Draft boleh belum lengkap. POI yang akan tampil harus punya paket Stories lengkap.
create function private.check_poi_publication()
returns trigger language plpgsql set search_path = '' as $$
declare quest_id uuid; variant public.konten;
begin
  if not new.is_published then return new; end if;
  select id_quest into quest_id from public.quest where id_poi = new.id_poi;
  if quest_id is null or
    (select count(*) from public.quest_opsi where id_quest = quest_id) <> 4 or
    (select count(*) from public.quest_opsi where id_quest = quest_id and is_correct) <> 1 or
    not exists (select 1 from public.konten where id_poi = new.id_poi) then
    raise sqlstate 'PT409' using message = 'POI_STORIES_INCOMPLETE';
  end if;
  for variant in select * from public.konten where id_poi = new.id_poi loop
    if not exists (select 1 from public.quest_teks where id_quest = quest_id
      and bahasa = variant.bahasa and profil = variant.profil) or
      (select count(*) from public.quest_opsi_text where id_quest = quest_id
        and bahasa = variant.bahasa) <> 4 then
      raise sqlstate 'PT409' using message = 'POI_VARIANT_INCOMPLETE';
    end if;
  end loop;
  return new;
end $$;
create trigger check_poi_publication before insert or update of is_published on public.poi
  for each row execute function private.check_poi_publication();
revoke all on function private.check_poi_publication() from public, anon, authenticated;
grant execute on function private.check_poi_publication() to service_role;
