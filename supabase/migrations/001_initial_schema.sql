create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  description text,
  package_manager text not null default 'npm' check (package_manager in ('npm','yarn','pnpm')),
  package_json jsonb,
  lock_file_content text,
  schedule_type text not null default 'manual' check (schedule_type in ('manual','weekly','monthly')),
  last_scan_at timestamptz,
  last_health_score int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dependency_scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  status text not null default 'completed' check (status in ('pending','running','completed','failed')),
  health_score int not null default 0,
  total_dependencies int not null default 0,
  total_dev_dependencies int not null default 0,
  outdated_count int not null default 0,
  vulnerable_count int not null default 0,
  deprecated_count int not null default 0,
  abandoned_count int not null default 0,
  critical_risk_count int not null default 0,
  high_risk_count int not null default 0,
  medium_risk_count int not null default 0,
  low_risk_count int not null default 0,
  raw_summary jsonb,
  created_at timestamptz default now()
);

create table if not exists public.dependency_scan_items (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.dependency_scans(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  package_name text not null,
  current_range text,
  current_version text,
  latest_version text,
  dependency_type text not null check (dependency_type in ('dependency','devDependency')),
  update_type text check (update_type in ('none','patch','minor','major','unknown')),
  risk_level text not null default 'none' check (risk_level in ('none','low','medium','high','critical')),
  risk_score int not null default 0,
  is_outdated boolean not null default false,
  is_vulnerable boolean not null default false,
  vulnerabilities jsonb,
  is_deprecated boolean not null default false,
  deprecated_reason text,
  is_possibly_abandoned boolean not null default false,
  last_published_at timestamptz,
  risk_reason text,
  ai_explanation text,
  recommended_action text,
  update_command text,
  npm_url text,
  repository_url text,
  created_at timestamptz default now()
);

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade default auth.uid(),
  email_enabled boolean not null default false,
  email_address text,
  discord_enabled boolean not null default false,
  discord_webhook_url text,
  slack_enabled boolean not null default false,
  slack_webhook_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.scan_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  schedule_type text not null default 'manual' check (schedule_type in ('manual','weekly','monthly')),
  is_active boolean not null default false,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger notification_settings_set_updated_at before update on public.notification_settings for each row execute function public.set_updated_at();
create trigger scan_schedules_set_updated_at before update on public.scan_schedules for each row execute function public.set_updated_at();

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists dependency_scans_user_id_idx on public.dependency_scans(user_id);
create index if not exists dependency_scans_project_id_idx on public.dependency_scans(project_id);
create index if not exists dependency_scans_created_at_idx on public.dependency_scans(created_at);
create index if not exists dependency_scan_items_scan_id_idx on public.dependency_scan_items(scan_id);
create index if not exists dependency_scan_items_project_id_idx on public.dependency_scan_items(project_id);
create index if not exists dependency_scan_items_user_id_idx on public.dependency_scan_items(user_id);
create index if not exists dependency_scan_items_package_name_idx on public.dependency_scan_items(package_name);
create index if not exists dependency_scan_items_risk_level_idx on public.dependency_scan_items(risk_level);
create index if not exists notification_settings_user_id_idx on public.notification_settings(user_id);
create index if not exists scan_schedules_user_id_idx on public.scan_schedules(user_id);
create index if not exists scan_schedules_project_id_idx on public.scan_schedules(project_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.dependency_scans enable row level security;
alter table public.dependency_scan_items enable row level security;
alter table public.notification_settings enable row level security;
alter table public.scan_schedules enable row level security;

create policy "profiles own rows" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "projects own rows" on public.projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dependency_scans own rows" on public.dependency_scans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dependency_scan_items own rows" on public.dependency_scan_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notification_settings own rows" on public.notification_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "scan_schedules own rows" on public.scan_schedules for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
