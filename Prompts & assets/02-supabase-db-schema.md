# 02 - Supabase Database Schema Prompt

Create the Supabase Postgres database schema for the **Dependency Risk Scanner** app.

The app uses:

- Angular frontend
- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions

## Goal

Create all database tables needed for users, projects, dependency scans, scan items, schedules, and notification settings.

## Important

Use Supabase Auth users as the source of truth.
Use `auth.users(id)` as the user reference.
Enable Row Level Security on all user-owned tables.
Users must only access their own projects, scans, scan items, and settings.

Generate a complete SQL migration file ready to paste into Supabase SQL Editor and run.

## Tables

### 1. profiles

Columns:

- id uuid primary key references auth.users(id) on delete cascade
- email text
- full_name text
- avatar_url text
- created_at timestamptz default now()
- updated_at timestamptz default now()

### 2. projects

Columns:

- id uuid primary key default gen_random_uuid()
- user_id uuid not null references auth.users(id) on delete cascade
- name text not null
- description text
- package_manager text not null default 'npm'
- package_json jsonb
- lock_file_content text
- schedule_type text not null default 'manual'
- last_scan_at timestamptz
- last_health_score int
- created_at timestamptz default now()
- updated_at timestamptz default now()

Allowed `schedule_type` values:

- manual
- weekly
- monthly

Allowed `package_manager` values:

- npm
- yarn
- pnpm

### 3. dependency_scans

Columns:

- id uuid primary key default gen_random_uuid()
- project_id uuid not null references projects(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- status text not null default 'completed'
- health_score int not null default 0
- total_dependencies int not null default 0
- total_dev_dependencies int not null default 0
- outdated_count int not null default 0
- vulnerable_count int not null default 0
- deprecated_count int not null default 0
- abandoned_count int not null default 0
- critical_risk_count int not null default 0
- high_risk_count int not null default 0
- medium_risk_count int not null default 0
- low_risk_count int not null default 0
- raw_summary jsonb
- created_at timestamptz default now()

Allowed `status` values:

- pending
- running
- completed
- failed

### 4. dependency_scan_items

Columns:

- id uuid primary key default gen_random_uuid()
- scan_id uuid not null references dependency_scans(id) on delete cascade
- project_id uuid not null references projects(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- package_name text not null
- current_range text
- current_version text
- latest_version text
- dependency_type text not null
- update_type text
- risk_level text not null default 'none'
- risk_score int not null default 0
- is_outdated boolean not null default false
- is_vulnerable boolean not null default false
- vulnerabilities jsonb
- is_deprecated boolean not null default false
- deprecated_reason text
- is_possibly_abandoned boolean not null default false
- last_published_at timestamptz
- risk_reason text
- ai_explanation text
- recommended_action text
- update_command text
- npm_url text
- repository_url text
- created_at timestamptz default now()

Allowed `dependency_type` values:

- dependency
- devDependency

Allowed `update_type` values:

- none
- patch
- minor
- major
- unknown

Allowed `risk_level` values:

- none
- low
- medium
- high
- critical

### 5. notification_settings

Columns:

- id uuid primary key default gen_random_uuid()
- user_id uuid not null references auth.users(id) on delete cascade
- email_enabled boolean not null default false
- email_address text
- discord_enabled boolean not null default false
- discord_webhook_url text
- slack_enabled boolean not null default false
- slack_webhook_url text
- created_at timestamptz default now()
- updated_at timestamptz default now()

### 6. scan_schedules

Columns:

- id uuid primary key default gen_random_uuid()
- project_id uuid not null references projects(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- schedule_type text not null default 'manual'
- is_active boolean not null default false
- last_run_at timestamptz
- next_run_at timestamptz
- created_at timestamptz default now()
- updated_at timestamptz default now()

Allowed `schedule_type` values:

- manual
- weekly
- monthly

## Indexes

Create useful indexes:

- projects(user_id)
- dependency_scans(user_id)
- dependency_scans(project_id)
- dependency_scans(created_at)
- dependency_scan_items(scan_id)
- dependency_scan_items(project_id)
- dependency_scan_items(user_id)
- dependency_scan_items(package_name)
- dependency_scan_items(risk_level)
- notification_settings(user_id)
- scan_schedules(user_id)
- scan_schedules(project_id)

## RLS

Enable Row Level Security for:

- profiles
- projects
- dependency_scans
- dependency_scan_items
- notification_settings
- scan_schedules

## Policies

### profiles

- Users can read their own profile.
- Users can update their own profile.
- Users can insert their own profile.

### projects

- Users can select only projects where user_id = auth.uid().
- Users can insert only projects where user_id = auth.uid().
- Users can update only projects where user_id = auth.uid().
- Users can delete only projects where user_id = auth.uid().

### dependency_scans

- Users can select only scans where user_id = auth.uid().
- Users can insert only scans where user_id = auth.uid().
- Users can update only scans where user_id = auth.uid().
- Users can delete only scans where user_id = auth.uid().

### dependency_scan_items

- Users can select only scan items where user_id = auth.uid().
- Users can insert only scan items where user_id = auth.uid().
- Users can update only scan items where user_id = auth.uid().
- Users can delete only scan items where user_id = auth.uid().

### notification_settings

- Users can select only their own notification settings.
- Users can insert only their own notification settings.
- Users can update only their own notification settings.
- Users can delete only their own notification settings.

### scan_schedules

- Users can select only their own schedules.
- Users can insert only their own schedules.
- Users can update only their own schedules.
- Users can delete only their own schedules.

## Additional requirements

Also create:

- `updated_at` trigger function
- triggers for `updated_at` on profiles, projects, notification_settings, and scan_schedules
- optional function to automatically create a profile when a new auth user is created
- check constraints for allowed enum-like text values

## Expected output

Generate a complete SQL migration file:

```text
supabase/migrations/001_initial_schema.sql
```

The SQL must be ready to paste into Supabase SQL Editor and run.
