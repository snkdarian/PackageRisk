create table if not exists public.update_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null references public.dependency_scans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  status text not null default 'draft' check (status in ('draft','applied','abandoned')),
  selected_item_ids uuid[] not null default '{}',
  package_json jsonb,
  summary jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, scan_id)
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_plans_set_updated_at') then
    create trigger update_plans_set_updated_at before update on public.update_plans for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists update_plans_user_id_idx on public.update_plans(user_id);
create index if not exists update_plans_project_id_idx on public.update_plans(project_id);
create index if not exists update_plans_scan_id_idx on public.update_plans(scan_id);
create index if not exists update_plans_status_idx on public.update_plans(status);

alter table public.update_plans enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'update_plans' and policyname = 'update_plans own rows') then
    create policy "update_plans own rows" on public.update_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
