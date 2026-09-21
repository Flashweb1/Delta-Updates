-- ============================================================
-- Delta Update — rebranding of the live site_config + is_admin()
-- (applies on top of 0001_init.sql, which was seeded as "Bjlinks News")
-- ============================================================

-- Rebrand the site configuration row.
update public.site_config
set site_name        = 'Delta Update',
    description      = 'Delta Update delivers premium journalism covering politics, business, technology, and more from Nigeria and around the world.',
    meta_description = 'Delta Update delivers premium journalism covering politics, business, technology, and more from Nigeria and around the world.',
    contact_email    = 'editor@deltaupdates.com',
    facebook         = 'https://facebook.com/deltaupdates',
    twitter          = 'https://twitter.com/deltaupdates',
    instagram        = 'https://instagram.com/deltaupdates',
    canonical_domain = 'https://deltaupdates.vercel.app',
    admin_emails     = array['admin@deltaupdates.com']::text[],
    updated_at       = now()
where id = 1;

-- Re-create is_admin() with the new allowlist email (replaces the
-- hard-coded admin@bjlinksnews.com from 0001).
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.uid = auth.uid()::text
  )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = any(
       coalesce((select s.admin_emails from public.site_config s where s.id = 1), '{}'::text[])
     )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@deltaupdates.com';
$$;