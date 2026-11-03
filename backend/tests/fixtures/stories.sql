-- DATA SIMULASI KHUSUS DATABASE PENGUJIAN IN-MEMORY. Jangan deploy fixture ini.
insert into auth.users (id) values
  ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002');
insert into public.zona (id_zona,nama,latitude,longitude,radius)
  values ('20000000-0000-4000-8000-000000000001','ZONA SIMULASI',0,0,10);
insert into public.poi (id_poi,id_zona,nama,path_foto,denah_x,denah_y,prioritas,estimasi_durasi)
  select ('30000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
    '20000000-0000-4000-8000-000000000001','SIMULASI POI ' || n,
    'simulation/photo-' || n || '.jpg',n,n,n,5 from generate_series(1,6) n;
insert into public.konten (id_poi,bahasa,profil,teks_cerita,path_audio,durasi_audio)
  select id_poi,'id','umum','Ini hanya data simulasi pengujian.',
    'simulation/audio.mp3',45 from public.poi;
insert into public.quest (id_quest,id_poi,tipe_quest)
  select ('40000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
    ('30000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'pilgan'
    from generate_series(1,6) n;
insert into public.quest_teks (id_quest,bahasa,profil,instruksi,pertanyaan,hint)
  select id_quest,'id','umum','Amati objek simulasi.','Pilih opsi simulasi A.','Petunjuk simulasi.'
    from public.quest;
insert into public.quest_opsi (id_quest,label_opsi,is_correct)
  select id_quest,label,label='A' from public.quest cross join unnest(array['A','B','C','D']) label;
insert into public.quest_opsi_text (id_quest,label_opsi,bahasa,teks_opsi)
  select id_quest,label_opsi,'id','Opsi simulasi ' || label_opsi from public.quest_opsi;
update public.poi set is_published = true;
insert into private.qr_tokens (token_hash,scope,id_zona,expires_at)
  values (repeat('a',64),'entrance','20000000-0000-4000-8000-000000000001',now()+interval '1 day');
insert into private.qr_tokens (token_hash,scope,id_poi,expires_at)
  select repeat(n::text,64),'poi',('30000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
    now()+interval '1 day' from generate_series(1,6) n;
