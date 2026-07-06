-- Create specialties table (idempotent)
create table if not exists specialties (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add specialty_id to profiles (idempotent)
alter table profiles
  add column if not exists specialty_id uuid references specialties(id);

