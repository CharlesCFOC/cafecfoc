-- CafeCFOC - full schema used by the app

create extension if not exists pgcrypto;

create or replace function public.cafecfoc_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.cafecfoc_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  password_hash text not null,
  role text not null,
  phone text not null default '',
  preferred_currency text not null default 'CAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cafecfoc_users_email_lower_idx
  on public.cafecfoc_users (lower(email));

create table if not exists public.cafecfoc_inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  quantity numeric not null default 0,
  unit text not null,
  threshold numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cafecfoc_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric not null default 0,
  currency text not null default 'CAD',
  stock_item_id uuid null,
  stock_usage numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cafecfoc_products_stock_item_id_fkey
    foreign key (stock_item_id) references public.cafecfoc_inventory(id) on delete set null
);

create table if not exists public.cafecfoc_menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  quantity numeric not null default 0,
  price_note text not null default '',
  section text not null default 'food',
  theme text not null default 'default',
  image_url text not null default '',
  image_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.cafecfoc_users(id) on delete set null
);

create table if not exists public.cafecfoc_sales (
  id uuid primary key default gen_random_uuid(),
  totals_by_currency jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.cafecfoc_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.cafecfoc_sale_items (
  id text primary key,
  sale_id uuid not null references public.cafecfoc_sales(id) on delete cascade,
  product_id uuid null references public.cafecfoc_products(id) on delete set null,
  name text not null,
  qty numeric not null default 0,
  unit_price numeric not null default 0,
  currency text not null default 'CAD',
  line_total numeric not null default 0,
  stock_item_id uuid null references public.cafecfoc_inventory(id) on delete set null,
  stock_usage numeric not null default 0
);

create index if not exists cafecfoc_sale_items_sale_id_idx
  on public.cafecfoc_sale_items (sale_id);

create table if not exists public.cafecfoc_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new',
  assigned_to uuid null references public.cafecfoc_users(id) on delete set null,
  notes text not null default '',
  totals_by_currency jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.cafecfoc_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_number integer null,
  items jsonb not null default '[]'::jsonb,
  archived boolean not null default false,
  archived_at timestamptz null,
  source text not null default 'menu',
  steps jsonb not null default '[]'::jsonb
);

create index if not exists cafecfoc_orders_created_at_idx
  on public.cafecfoc_orders (created_at desc);

create table if not exists public.cafecfoc_service_schedule (
  id uuid primary key default gen_random_uuid(),
  service_date date not null unique,
  created_at timestamptz not null default now(),
  created_by uuid null references public.cafecfoc_users(id) on delete set null,
  updated_at timestamptz null,
  updated_by uuid null references public.cafecfoc_users(id) on delete set null
);

create table if not exists public.cafecfoc_service_assignments (
  service_schedule_id uuid not null references public.cafecfoc_service_schedule(id) on delete cascade,
  user_id uuid not null references public.cafecfoc_users(id) on delete cascade,
  primary key (service_schedule_id, user_id)
);

create table if not exists public.cafecfoc_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  task_date date not null,
  start_time text not null,
  end_time text not null,
  assigned_to uuid null references public.cafecfoc_users(id) on delete set null,
  description text not null default '',
  status text not null default 'todo',
  created_by uuid not null references public.cafecfoc_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cafecfoc_accounting_counts (
  id uuid primary key default gen_random_uuid(),
  currency text not null default 'CAD',
  counted_by text not null,
  counted_signature text not null,
  verified_by text not null,
  verified_signature text not null,
  notes text not null default '',
  lines jsonb not null default '[]'::jsonb,
  electronic_payments jsonb not null default '{}'::jsonb,
  total_amount numeric not null default 0,
  summary text not null default '',
  created_by uuid null references public.cafecfoc_users(id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists cafecfoc_users_touch_updated_at on public.cafecfoc_users;
create trigger cafecfoc_users_touch_updated_at
before update on public.cafecfoc_users
for each row execute function public.cafecfoc_touch_updated_at();

drop trigger if exists cafecfoc_inventory_touch_updated_at on public.cafecfoc_inventory;
create trigger cafecfoc_inventory_touch_updated_at
before update on public.cafecfoc_inventory
for each row execute function public.cafecfoc_touch_updated_at();

drop trigger if exists cafecfoc_products_touch_updated_at on public.cafecfoc_products;
create trigger cafecfoc_products_touch_updated_at
before update on public.cafecfoc_products
for each row execute function public.cafecfoc_touch_updated_at();

drop trigger if exists cafecfoc_menu_items_touch_updated_at on public.cafecfoc_menu_items;
create trigger cafecfoc_menu_items_touch_updated_at
before update on public.cafecfoc_menu_items
for each row execute function public.cafecfoc_touch_updated_at();

drop trigger if exists cafecfoc_orders_touch_updated_at on public.cafecfoc_orders;
create trigger cafecfoc_orders_touch_updated_at
before update on public.cafecfoc_orders
for each row execute function public.cafecfoc_touch_updated_at();

drop trigger if exists cafecfoc_tasks_touch_updated_at on public.cafecfoc_tasks;
create trigger cafecfoc_tasks_touch_updated_at
before update on public.cafecfoc_tasks
for each row execute function public.cafecfoc_touch_updated_at();
