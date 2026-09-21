-- ============================================================
-- Delta Update — Supabase schema + RLS
-- Replaces Firestore collections + firestore.rules + functions/
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────
do $$ begin
  create type article_status as enum ('draft', 'review', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type comment_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin_role as enum ('admin', 'editor');
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  emoji       text not null default '📌',
  color       text not null default '#6B7280',
  description text not null default '',
  visible     boolean not null default true,
  ord         integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.articles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) > 0 and char_length(title) <= 240),
  dek         text not null default '' check (char_length(dek) <= 600),
  body        text[] not null default '{}' check (coalesce(array_length(body, 1), 0) <= 200),
  category    text not null check (char_length(category) > 0 and char_length(category) <= 40),
  tags        text[] not null default '{}' check (coalesce(array_length(tags, 1), 0) <= 20),
  author      text not null,
  author_role text not null default '',
  -- Display string (matches historical Firestore payloads), e.g. "Aug 24, 2026".
  -- Ordering uses created_at/published_at_ts below.
  published_at    text not null default '',
  published_at_ts timestamptz not null default now(),
  image       text not null default '',
  slug        text not null unique check (char_length(slug) <= 200 and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  read_time   integer not null default 1 check (read_time >= 1),
  featured    boolean not null default false,
  status      article_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.site_config (
  id                         int primary key default 1 check (id = 1),
  site_name                  text not null default 'Delta Update',
  tagline                    text not null default 'Information for living',
  description                text not null default '',
  contact_email              text not null default '',
  facebook                   text not null default '',
  twitter                    text not null default '',
  instagram                  text not null default '',
  youtube                    text not null default '',
  default_category           text not null default 'News',
  breaking_news              jsonb not null default '[]'::jsonb,
  homepage_sections          jsonb not null default '[]'::jsonb,
  featured_article_id        text,
  meta_description           text not null default '',
  og_image_url               text not null default '',
  twitter_card_type          text not null default 'summary_large_image',
  canonical_domain           text not null default '',
  audio_enabled              boolean not null default true,
  drop_caps                  boolean not null default true,
  default_font_size          text not null default 'md',
  default_font_style         text not null default 'serif',
  newsletter_url             text not null default '',
  articles_per_section       integer not null default 4,
  show_editors_pick          boolean not null default true,
  show_newsletter            boolean not null default true,
  show_opinion               boolean not null default true,
  show_top_stories           boolean not null default true,
  require_comment_moderation boolean not null default true,
  notify_on_comment          boolean not null default true,
  notify_on_publish          boolean not null default true,
  admin_emails               text[] not null default '{}'::text[],
  updated_at                 timestamptz not null default now()
);

create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid references public.articles(id) on delete cascade,
  article_title text not null default '',
  author        text not null default 'Anonymous',
  author_email  text not null default '',
  body          text not null check (char_length(body) <= 2000),
  status        comment_status not null default 'pending',
  ai_verdict    jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.media (
  id         uuid primary key default gen_random_uuid(),
  url        text not null check (url ~ '^https?://'),
  name       text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.pending_users (
  uid            text primary key,
  email          text not null,
  display_name   text,
  email_verified boolean not null default false,
  created_at     timestamptz not null default now()
);

create table if not exists public.admins (
  uid          text primary key,
  role         admin_role not null default 'editor',
  approved_at  timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  active        boolean not null default true,
  subscribed_at timestamptz not null default now()
);

-- ============================================================
-- Helpers
-- ============================================================

-- Body must contain at least one paragraph on INSERT (mirrors Firestore create rule).
create or replace function public.enforce_article_body_on_insert()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.body is null or coalesce(array_length(new.body, 1), 0) < 1 then
    raise exception 'articles.body must contain at least one paragraph';
  end if;
  return new;
end;
$$;

drop trigger if exists articles_insert_body on public.articles;
create trigger articles_insert_body
  before insert on public.articles
  for each row execute function public.enforce_article_body_on_insert();

-- Updated-at timestamp bump.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- Auto-create a pending_users row for every new auth user.
-- SECURITY DEFINER so the Auth trigger can write the row; runs as the caller (postgres)
-- and only inserts data derived from the auth record itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pending_users (uid, email, display_name, email_verified)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email_confirmed_at is not null, false)
  )
  on conflict (uid) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin(): admin via admins table OR allowlisted email (site_config.admin_emails
-- plus a hard-coded fallback matching the old firestore.rules allowlist).
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
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'ajikesamuel4@gmail.com';
$$;

-- ============================================================
-- RLS policies (mirrors firestore.rules)
-- ============================================================

alter table public.articles              enable row level security;
alter table public.categories            enable row level security;
alter table public.site_config           enable row level security;
alter table public.comments              enable row level security;
alter table public.media                 enable row level security;
alter table public.pending_users         enable row level security;
alter table public.admins                enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ── articles ────────────────────────────────────────────────
create policy "articles_select_public" on public.articles
  for select to anon, authenticated
  using (status = 'published' or public.is_admin());

create policy "articles_insert_admin" on public.articles
  for insert to authenticated
  with check (public.is_admin());

create policy "articles_update_admin" on public.articles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "articles_delete_admin" on public.articles
  for delete to authenticated
  using (public.is_admin());

-- ── categories ──────────────────────────────────────────────
create policy "categories_select_public" on public.categories
  for select to anon, authenticated
  using (true);

create policy "categories_write_admin" on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── site_config ─────────────────────────────────────────────
create policy "site_config_select_public" on public.site_config
  for select to anon, authenticated
  using (true);

create policy "site_config_write_admin" on public.site_config
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── comments ────────────────────────────────────────────────
create policy "comments_select_authed" on public.comments
  for select to authenticated
  using (true);

create policy "comments_insert_authed" on public.comments
  for insert to authenticated
  with check (char_length(body) <= 2000);

create policy "comments_update_admin" on public.comments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "comments_delete_admin" on public.comments
  for delete to authenticated
  using (public.is_admin());

-- ── media ───────────────────────────────────────────────────
create policy "media_select_public" on public.media
  for select to anon, authenticated
  using (true);

create policy "media_write_admin" on public.media
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── pending_users: user may self-create; read/delete admin-only ──
create policy "pending_users_insert_self" on public.pending_users
  for insert to authenticated
  with check (auth.uid()::text = uid);

create policy "pending_users_select_admin" on public.pending_users
  for select to authenticated
  using (public.is_admin());

create policy "pending_users_delete_admin" on public.pending_users
  for delete to authenticated
  using (public.is_admin());

-- ── admins: self or admin read only ─────────────────────────
create policy "admins_select_self_or_admin" on public.admins
  for select to authenticated
  using (auth.uid()::text = uid or public.is_admin());

-- ── newsletter_subscribers: public insert, admin manage ─────
create policy "newsletter_subscribers_insert" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (char_length(email) <= 254 and email like '%@%');

create policy "newsletter_subscribers_select_admin" on public.newsletter_subscribers
  for select to authenticated
  using (public.is_admin());

create policy "newsletter_subscribers_update_admin" on public.newsletter_subscribers
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "newsletter_subscribers_delete_admin" on public.newsletter_subscribers
  for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- Admin approval RPCs (replaces functions/src/index.ts)
-- SECURITY DEFINER is required to write records whose RLS would
-- otherwise restrict; the function body re-verifies the caller.
-- Execute privilege limited to authenticated.  NOTE: for production
-- deploy, first run `supabase db advisors` and review.
-- ============================================================

create or replace function public.approve_user(target_uid text, target_role text default 'editor')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Authorize the caller (inside security definer because RLS is bypassed here).
  if not (public.is_admin()) then
    raise exception 'permission denied for approve_user';
  end if;

  insert into public.admins (uid, role, approved_at)
  values (target_uid, (case when target_role = 'admin' then 'admin'::public.admin_role else 'editor'::public.admin_role end), now())
  on conflict (uid) do update set role = excluded.role, approved_at = now();

  delete from public.pending_users where uid = target_uid;
end;
$$;

create or replace function public.revoke_user(target_uid text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin()) then
    raise exception 'permission denied for revoke_user';
  end if;

  delete from public.admins where uid = target_uid;
end;
$$;

revoke execute on function public.approve_user(text, text) from public, anon;
grant execute on function public.approve_user(text, text) to authenticated;

revoke execute on function public.revoke_user(text) from public, anon;
grant execute on function public.revoke_user(text) to authenticated;

-- ============================================================
-- Realtime
-- ============================================================

alter publication supabase_realtime add table public.articles;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.site_config;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.media;
alter publication supabase_realtime add table public.pending_users;
alter publication supabase_realtime add table public.newsletter_subscribers;

-- ============================================================
-- Indexes (replaces firestore.indexes.json)
-- ============================================================

create index if not exists articles_status_published_at_idx
  on public.articles (status, published_at_ts desc);
create index if not exists articles_category_status_idx
  on public.articles (category, status, published_at_ts desc);
create index if not exists articles_featured_status_idx
  on public.articles (featured, status, published_at_ts desc);
create index if not exists articles_created_at_idx
  on public.articles (created_at desc);
create index if not exists articles_slug_idx
  on public.articles (slug);
create index if not exists categories_ord_idx
  on public.categories (ord asc);
create index if not exists comments_created_at_idx
  on public.comments (created_at desc);
create index if not exists media_created_at_idx
  on public.media (created_at desc);

-- ============================================================
-- Seed data
-- ============================================================

insert into public.categories (name, slug, emoji, color, description, visible, ord) values
  ('Politics',  'politics',  '🏛️', '#E32626', '', true,  1),
  ('News',      'news',      '📰', '#3B82F6', '', true,  2),
  ('Business',  'business',  '💼', '#F2A900', '', true,  3),
  ('World',     'world',     '🌍', '#10B981', '', true,  4),
  ('Tech',      'tech',      '💻', '#6366F1', '', true,  5),
  ('Health',    'health',    '❤️', '#EC4899', '', true,  6),
  ('Sports',    'sports',    '⚽', '#F97316', '', true,  7),
  ('Religion',  'religion',  '✝️', '#8B5CF6', '', true,  8),
  ('Education', 'education', '📚', '#14B8A6', '', true,  9),
  ('Stories',   'stories',   '🎬', '#F59E0B', '', true, 10)
on conflict (slug) do nothing;

insert into public.site_config (id, site_name, tagline, description, contact_email, facebook, twitter,
  instagram, youtube, default_category, meta_description, canonical_domain, admin_emails)
values (1, 'Delta Update', 'Information for living',
  'Delta Update delivers premium journalism covering politics, business, technology, and more from Nigeria and around the world.',
  'editor@deltaupdates.com', 'https://facebook.com/deltaupdates', 'https://twitter.com/deltaupdates',
  'https://instagram.com/deltaupdates', '', 'News',
  'Delta Update delivers premium journalism covering politics, business, technology, and more from Nigeria and around the world.',
  'https://deltaupdates.vercel.app', array['ajikesamuel4@gmail.com']::text[])
on conflict (id) do nothing;

-- Seed published articles so the site has content at launch.
insert into public.articles (title, dek, body, category, tags, author, author_role, published_at, published_at_ts, image, slug, read_time, featured, status, created_at)
values
  ('Governor Oborevwori Commissions Landmark Secretariat Complex in Delta State',
   'A milestone achievement for public service delivery and regional administration efficiency in Asaba.',
   array['The Executive Governor of Delta State has officially commissioned the modern state secretariat complex, marking a pivotal turn for administrative efficiency and civil service excellence in the region.',
         'Designed with modern sustainable architecture and modern digital governance infrastructure, the complex integrates energy-efficient solar power, high-speed fiber optics, and dedicated public service centers.',
         'Dignitaries, community elders, and administrative leaders gathered to celebrate the milestone, praising the administration for prioritizing civil welfare, transparency, and infrastructural transformation across Delta State.'],
   'Politics', array['Delta State','Infrastructure','Governance','Nigeria'], 'Blessing Johnson', 'Chief Political Correspondent',
   'Aug 24, 2026', '2026-08-24T10:00:00Z', 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
   'governor-oborevwori-commissions-delta-state-secretariat', 4, true, 'published', now() - interval '1 day'),
  ('Nigerian Economy Shows Resilient Growth as Energy & Tech Sectors Expand',
   'Quarterly financial reports highlight unexpected gains in non-oil exports and fintech innovation hubs.',
   array['Nigeria’s economic indicators demonstrated robust expansion this quarter, fueled by accelerated private sector investment in agricultural technology, clean energy initiatives, and financial services.',
         'Analytical reports released by regional trade boards indicate a 14% uptick in commercial exports, signaling strong global interest and local entrepreneurism.'],
   'Business', array['Economy','Finance','Tech','Markets'], 'Emmanuel Okafor', 'Senior Financial Analyst',
   'Aug 23, 2026', '2026-08-23T10:00:00Z', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
   'nigerian-economy-shows-resilient-growth', 3, false, 'published', now() - interval '2 days'),
  ('Warri Tech Hub Launches Pioneer AI & Renewable Energy Innovation Center',
   'Fostering local tech talent, youth empowerment, and sustainable engineering solutions for West Africa.',
   array['In an ambitious move to propel technological advancement, a state-of-the-art innovation incubator has opened its doors in Warri.',
         'The center aims to train over 5,000 young developers, climate engineers, and entrepreneurs over the next three years.'],
   'Tech', array['AI','Innovation','Warri','Education'], 'Chidinma Adebayo', 'Technology Editor',
   'Aug 22, 2026', '2026-08-22T10:00:00Z', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
   'warri-tech-hub-launches-pioneer-ai-center', 5, false, 'published', now() - interval '3 days');

-- ============================================================
-- Storage (replaces Firebase Storage)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('articles', 'articles', true)
on conflict (id) do nothing;

create policy "articles_images_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'articles');

create policy "articles_images_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'articles' and (storage.foldername(name))[1] = 'articles');

create policy "articles_images_update_owner" on storage.objects
  for update to authenticated
  using (bucket_id = 'articles' and owner = auth.uid())
  with check (bucket_id = 'articles');

create policy "articles_images_delete_owner" on storage.objects
  for delete to authenticated
  using (bucket_id = 'articles' and owner = auth.uid());