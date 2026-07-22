-- Cuanto tables for Renace InsForge (anon-friendly)
-- Apply on InsForge Postgres / PostgREST

create table if not exists public.cuanto_spaces (
  id text primary key,
  name text not null,
  currency_code text not null default 'DOP',
  country_code text not null default 'DO',
  user_name text not null default '',
  phone_whatsapp text not null default '',
  role text not null default 'owner',
  updated_at timestamptz not null default now()
);

create table if not exists public.cuanto_categories (
  id text primary key,
  space_id text not null references public.cuanto_spaces(id) on delete cascade,
  name text not null,
  icon text not null default 'wallet',
  color text not null default '#2F8A5C',
  type text not null check (type in ('expense', 'income')),
  is_default boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists cuanto_categories_space_idx on public.cuanto_categories(space_id);

create table if not exists public.cuanto_transactions (
  id text primary key,
  space_id text not null references public.cuanto_spaces(id) on delete cascade,
  category_id text not null,
  type text not null check (type in ('expense', 'income')),
  amount numeric(14, 2) not null check (amount >= 0),
  occurred_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cuanto_transactions_space_date_idx
  on public.cuanto_transactions(space_id, occurred_on desc);

-- Grant anon access (Renace PostgREST)
grant select, insert, update, delete on public.cuanto_spaces to anon, authenticated;
grant select, insert, update, delete on public.cuanto_categories to anon, authenticated;
grant select, insert, update, delete on public.cuanto_transactions to anon, authenticated;
