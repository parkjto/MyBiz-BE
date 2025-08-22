-- Extensions
create extension if not exists pgcrypto;

-- 1) users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar,
  kakao_id varchar,
  naver_id varchar,
  nickname varchar,
  profile_image_url text,
  phone_number varchar,
  business_type varchar,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users (email);

-- 2) user_stores
create table if not exists public.user_stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  store_name varchar,
  address text,
  road_address text,
  phone varchar,
  category varchar,
  coordinates_x varchar,
  coordinates_y varchar,
  place_id varchar,
  map_url text,
  extracted_at timestamptz,
  coordinate_id varchar,
  manual_check_url text,
  is_primary boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index if not exists idx_user_stores_user on public.user_stores (user_id);
create index if not exists idx_user_stores_place on public.user_stores (place_id);

-- 3) naver_sessions
create table if not exists public.naver_sessions (
  id uuid primary key default gen_random_uuid(),
  user_store_id uuid not null references public.user_stores(id) on delete cascade,
  encrypted_cookies text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_store_id)
);

create index if not exists idx_naver_sessions_store on public.naver_sessions (user_store_id);
create index if not exists idx_naver_sessions_expires on public.naver_sessions (expires_at);

-- 4) naver_reviews
create table if not exists public.naver_reviews (
  id uuid primary key default gen_random_uuid(),
  user_store_id uuid not null references public.user_stores(id) on delete cascade,
  review_content text not null,
  author_nickname text,
  review_date date,
  rating int,
  created_at timestamptz not null default now(),
  check (rating is null or (rating >= 0 and rating <= 5))
);

create index if not exists idx_naver_reviews_store on public.naver_reviews (user_store_id);
create index if not exists idx_naver_reviews_date on public.naver_reviews (review_date);

-- 5) review_analysis
create table if not exists public.review_analysis (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.naver_reviews(id) on delete cascade,
  summary text,
  sentiment varchar,
  positive_keywords text[],
  negative_keywords text[],
  created_at timestamptz not null default now(),
  unique (review_id)
);

create index if not exists idx_review_analysis_review on public.review_analysis (review_id);

-- Updated triggers to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if exists (select 1 from information_schema.columns where table_name='users' and column_name='updated_at') then
    create trigger trg_users_updated before update on public.users for each row execute procedure public.set_updated_at();
  end if;
  if exists (select 1 from information_schema.columns where table_name='user_stores' and column_name='updated_at') then
    create trigger trg_user_stores_updated before update on public.user_stores for each row execute procedure public.set_updated_at();
  end if;
  if exists (select 1 from information_schema.columns where table_name='naver_sessions' and column_name='updated_at') then
    create trigger trg_naver_sessions_updated before update on public.naver_sessions for each row execute procedure public.set_updated_at();
  end if;
end $$;


