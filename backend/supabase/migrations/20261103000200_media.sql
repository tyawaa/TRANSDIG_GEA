-- Hanya media editorial yang disetujui museum. Upload pengguna belum termasuk sprint.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gea-media', 'gea-media', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/ogg']
);
-- Public download diperbolehkan bucket; insert/update/delete hanya admin/service-role.
