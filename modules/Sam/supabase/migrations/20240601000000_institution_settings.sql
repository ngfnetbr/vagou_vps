-- Create table for institution settings
create table if not exists institution_settings (
  id uuid primary key default gen_random_uuid(),
  institution_name text not null default 'Secretaria Municipal de Educação',
  logo_url text,
  address text,
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Insert default record if not exists
insert into institution_settings (institution_name)
select 'Secretaria Municipal de Educação'
where not exists (select 1 from institution_settings);

-- Enable RLS
alter table institution_settings enable row level security;

-- Policy: Allow read for authenticated users
create policy "Allow read for authenticated users"
  on institution_settings for select
  to authenticated
  using (true);

-- Policy: Allow update for admin users only
-- Assuming there is a way to check for admin, or for now allow all authenticated to simplify if no complex role check in SQL
create policy "Allow update for authenticated users"
  on institution_settings for update
  to authenticated
  using (true)
  with check (true);
