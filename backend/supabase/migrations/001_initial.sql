-- BidTrust initial schema migration

-- profiles
create table profiles (
  id uuid primary key references auth.users(id),
  email text unique not null,
  full_name text,
  phone text,
  avatar_url text,
  role text default 'buyer' check (role in ('buyer','seller','admin')),
  seller_verified boolean default false,
  rating numeric(3,2),
  total_sales integer default 0,
  total_purchases integer default 0,
  created_at timestamptz default now()
);

-- listings
create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) not null,
  title text not null,
  description text,
  category text,
  condition text check (condition in ('new','like_new','good','fair','poor')),
  starting_price numeric(10,2) not null,
  reserve_price numeric(10,2),
  buy_now_price numeric(10,2),
  current_price numeric(10,2),
  auction_end_time timestamptz not null,
  status text default 'active' check (status in ('active','ended','payment_held','sold','cancelled')),
  verified boolean default false,
  location text,
  ai_estimated_value_low numeric(10,2),
  ai_estimated_value_high numeric(10,2),
  view_count integer default 0,
  created_at timestamptz default now()
);

-- listing_photos
create table listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  url text not null,
  public_id text,
  is_primary boolean default false,
  sort_order integer default 0
);

-- bids
create table bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) not null,
  bidder_id uuid references profiles(id) not null,
  amount numeric(10,2) not null,
  status text default 'active' check (status in ('active','retracted','won','lost')),
  created_at timestamptz default now()
);

-- offers
create table offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) not null,
  buyer_id uuid references profiles(id) not null,
  amount numeric(10,2) not null,
  message text,
  status text default 'pending' check (status in ('pending','accepted','declined','expired')),
  created_at timestamptz default now()
);

-- transactions (escrow)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) not null,
  buyer_id uuid references profiles(id) not null,
  seller_id uuid references profiles(id) not null,
  amount numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  stripe_payment_intent_id text unique,
  status text default 'pending' check (status in ('pending','held','released','refunded','disputed')),
  shipping_tracking text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

-- enable RLS
alter table profiles enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table bids enable row level security;
alter table offers enable row level security;
alter table transactions enable row level security;

-- basic policies (service role bypasses all, these are for client-side)
create policy "Public profiles" on profiles for select using (true);
create policy "Own profile update" on profiles for update using (auth.uid() = id);
create policy "Public listings" on listings for select using (true);
create policy "Seller insert listing" on listings for insert with check (auth.uid() = seller_id);
create policy "Seller update own listing" on listings for update using (auth.uid() = seller_id);
create policy "Public photos" on listing_photos for select using (true);
create policy "Public bids" on bids for select using (true);
create policy "Auth bid insert" on bids for insert with check (auth.uid() = bidder_id);
create policy "Own offers" on offers for select using (auth.uid() = buyer_id or auth.uid() = (select seller_id from listings where id = listing_id));
create policy "Auth offer insert" on offers for insert with check (auth.uid() = buyer_id);
create policy "Own transactions" on transactions for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Helper functions for stats
create or replace function increment_total_sales(seller_id uuid)
returns void language sql security definer as $$
  update profiles set total_sales = total_sales + 1 where id = seller_id;
$$;

create or replace function increment_total_purchases(buyer_id uuid)
returns void language sql security definer as $$
  update profiles set total_purchases = total_purchases + 1 where id = buyer_id;
$$;
