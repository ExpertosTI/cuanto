-- Cuanto SaaS schema (InsForge / Postgres)
-- Apply: npx @insforge/cli db migrations up --all

-- Tenants / workspaces
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country_code text not null default 'DO',
  currency_code text not null default 'DOP',
  whatsapp_business text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- App profiles (1:1 with auth.users when available)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  email text,
  phone_whatsapp text,
  avatar_url text,
  country_code text not null default 'DO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Roles inside an organization
create type public.org_role as enum ('owner', 'admin', 'member');

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.org_role not null default 'member',
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  joined_at timestamptz not null default now(),
  unique (org_id, profile_id)
);

create index if not exists memberships_org_idx on public.memberships(org_id);
create index if not exists memberships_profile_idx on public.memberships(profile_id);

-- SaaS plans & subscriptions
create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_cents integer not null default 0,
  currency_code text not null default 'DOP',
  max_members integer not null default 1,
  features jsonb not null default '[]'::jsonb
);

insert into public.plans (id, name, price_cents, currency_code, max_members, features)
values
  ('free', 'Gratis', 0, 'DOP', 1, '["gastos","ingresos","categorias"]'::jsonb),
  ('pro', 'Pro', 49900, 'DOP', 10, '["whatsapp","qr","equipo","reportes"]'::jsonb),
  ('business', 'Negocio', 149900, 'DOP', 50, '["whatsapp","qr","equipo","reportes","admin_scan"]'::jsonb)
on conflict (id) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Finance categories (renamable by user)
create type public.tx_type as enum ('expense', 'income');

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  icon text not null default 'wallet',
  color text not null default '#1a7a55',
  type public.tx_type not null,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_org_idx on public.categories(org_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  type public.tx_type not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency_code text not null default 'DOP',
  occurred_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_org_date_idx on public.transactions(org_id, occurred_on desc);

-- WhatsApp / QR invites
create type public.invite_kind as enum ('client_join', 'admin_join', 'checkin');

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  token text not null unique,
  kind public.invite_kind not null default 'client_join',
  role public.org_role not null default 'member',
  created_by uuid references public.profiles(id) on delete set null,
  label text,
  whatsapp_to text,
  max_uses integer not null default 1,
  use_count integer not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invites_token_idx on public.invites(token);
create index if not exists invites_org_idx on public.invites(org_id);

-- Member QR codes for admin scanning
create table if not exists public.member_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, profile_id)
);

-- Admin scan log (WhatsApp QR / member QR)
create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  scanned_by uuid references public.profiles(id) on delete set null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  invite_id uuid references public.invites(id) on delete set null,
  payload text not null,
  source text not null default 'qr'
    check (source in ('qr', 'whatsapp', 'manual')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scan_events_org_idx on public.scan_events(org_id, created_at desc);

-- Helper: membership check for RLS
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.profiles p on p.id = m.profile_id
    where m.org_id = target_org
      and m.status = 'active'
      and p.auth_user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.profiles p on p.id = m.profile_id
    where m.org_id = target_org
      and m.status = 'active'
      and m.role in ('owner', 'admin')
      and p.auth_user_id = auth.uid()
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.invites enable row level security;
alter table public.member_codes enable row level security;
alter table public.scan_events enable row level security;

-- Profiles: users see/update self
create policy profiles_select_self on public.profiles
  for select using (auth_user_id = auth.uid() or id in (
    select m.profile_id from public.memberships m
    where public.is_org_member(m.org_id)
  ));

create policy profiles_update_self on public.profiles
  for update using (auth_user_id = auth.uid());

create policy profiles_insert_self on public.profiles
  for insert with check (auth_user_id = auth.uid());

-- Org policies
create policy orgs_select_member on public.organizations
  for select using (public.is_org_member(id));

create policy orgs_update_admin on public.organizations
  for update using (public.is_org_admin(id));

create policy orgs_insert_auth on public.organizations
  for insert with check (auth.uid() is not null);

-- Memberships
create policy memberships_select on public.memberships
  for select using (public.is_org_member(org_id));

create policy memberships_admin_write on public.memberships
  for all using (public.is_org_admin(org_id));

-- Categories & transactions scoped to org
create policy categories_member_all on public.categories
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy transactions_member_all on public.transactions
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy subscriptions_member_select on public.subscriptions
  for select using (public.is_org_member(org_id));

create policy subscriptions_admin_write on public.subscriptions
  for all using (public.is_org_admin(org_id));

create policy invites_admin_all on public.invites
  for all using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy invites_select_token on public.invites
  for select using (revoked_at is null);

create policy member_codes_member_select on public.member_codes
  for select using (public.is_org_member(org_id));

create policy member_codes_admin_write on public.member_codes
  for all using (public.is_org_admin(org_id));

create policy scan_events_admin_all on public.scan_events
  for all using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy scan_events_member_select on public.scan_events
  for select using (public.is_org_member(org_id));

-- Plans readable by all authenticated users
alter table public.plans enable row level security;
create policy plans_read on public.plans for select using (true);
