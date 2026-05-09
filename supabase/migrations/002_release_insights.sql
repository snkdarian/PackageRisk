alter table public.dependency_scan_items
add column if not exists release_insights jsonb;
