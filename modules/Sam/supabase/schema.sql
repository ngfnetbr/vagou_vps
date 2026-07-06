-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enums
create type user_role as enum ('admin', 'professional', 'school_coord');
create type student_status as enum ('active', 'waiting', 'finished');
create type appointment_status as enum ('scheduled', 'completed', 'missed', 'cancelled');

-- Schools Table
create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role user_role default 'professional',
  specialty text, -- Deprecated: kept for backward compatibility
  specialty_id uuid references specialties(id),
  school_id uuid references schools(id), -- For school coordinators
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Students Table
create table students (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  birth_date date,
  school_id uuid references schools(id),
  class_name text, -- Turma/Série
  guardian_name text,
  status student_status default 'waiting',
  observations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Appointments Table
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade not null,
  professional_id uuid references profiles(id) not null,
  date timestamp with time zone not null,
  duration_minutes integer default 30,
  type text not null, -- 'Fonoaudiologia', 'Psicologia', etc.
  description text,
  evolution text,
  action_plan text,
  status appointment_status default 'scheduled',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table schools enable row level security;
alter table students enable row level security;
alter table appointments enable row level security;

-- Policies (Simplified for initial setup)

-- Profiles: Public read (for now, or authenticated)
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Schools: Readable by authenticated users
create policy "Schools are viewable by authenticated users"
  on schools for select
  to authenticated
  using ( true );

-- Students: Readable by authenticated users (Refine later for specific roles)
create policy "Students are viewable by authenticated users"
  on students for select
  to authenticated
  using ( true );

create policy "Professionals and Admins can insert students"
  on students for insert
  to authenticated
  with check ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'professional')
    )
  );

create policy "Professionals and Admins can update students"
  on students for update
  to authenticated
  using ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'professional')
    )
  );

-- Appointments:
create policy "Appointments viewable by authenticated users"
  on appointments for select
  to authenticated
  using ( true );

create policy "Professionals can insert appointments"
  on appointments for insert
  to authenticated
  with check ( 
    auth.uid() = professional_id 
  );

create policy "Professionals can update own appointments"
  on appointments for update
  to authenticated
  using ( 
    auth.uid() = professional_id 
  );

-- Helper to handle new user creation automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'professional');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed Data (Optional - for testing)
insert into schools (name, address) values
('Escola Municipal A', 'Rua das Flores, 123'),
('CMEI B', 'Av. Brasil, 456'),
('Escola Estadual C', 'Rua Minas Gerais, 789');
