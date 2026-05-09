# 04 - Connect Angular Frontend to Supabase Prompt

Connect the Angular frontend to the real Supabase database and the real `analyze-dependencies` Supabase Edge Function.

## Context

The app is called **Dependency Risk Scanner**.

It uses:

- Angular
- Angular Material
- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions

The database schema already exists.
The `analyze-dependencies` Edge Function already exists.

## Goal

Make the app work end-to-end with real data:

1. User logs in with Supabase Auth.
2. User creates a project.
3. User pastes or uploads `package.json`.
4. User runs a scan.
5. The scan calls the Supabase Edge Function.
6. The scan result is saved in Supabase.
7. The report page loads real scan data from Supabase.
8. Dashboard cards and charts are calculated from saved scans.

## Requirements

### 1. Supabase client setup

Create or update `SupabaseService`.

Requirements:

- Use the Supabase URL and anon key from environment files.
- Do not hardcode secrets.
- Do not expose the service role key in Angular.
- Expose the Supabase client safely for app services.

Environment example:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

### 2. AuthService

Implement:

- sign up
- login
- logout
- get current user
- listen to auth state changes
- route guard for authenticated pages

After login, redirect to `/dashboard`.
After logout, redirect to `/login`.

### 3. ProjectService

Implement real Supabase queries for `projects` table.

Methods:

- getProjects()
- getProjectById(id)
- createProject(project)
- updateProject(id, updates)
- deleteProject(id)
- updateProjectSchedule(id, scheduleType)

Rules:

- Always scope by the authenticated user.
- Let RLS protect data too.
- Handle errors cleanly.

### 4. ScanService

Update `ScanService` to call:

```ts
supabase.functions.invoke('analyze-dependencies', {
  body: {
    projectId,
    packageJson,
    lockFileContent
  }
});
```

Methods:

- runScan(projectId, packageJson, lockFileContent?)
- getScanById(scanId)
- getScanItems(scanId)
- getScansByProject(projectId)
- getScanHistory()
- compareScans(previousScanId, currentScanId)

On successful scan:

- redirect to `/reports/:scanId`

On failed scan:

- show Angular Material snackbar with a useful message
- keep user on New Scan page

### 5. New Scan page

Update the New Scan page so it uses real services.

Behavior:

- User selects a project or creates a project.
- User pastes or uploads `package.json`.
- Validate JSON before calling the Edge Function.
- Show dependency count and devDependency count before scanning.
- Button: Analyze dependencies.
- Show loading state while the Edge Function runs.
- Disable button while scan is running.
- On success, redirect to report page.
- On error, show snackbar.

### 6. Report page

Update the report page to load real data.

Route:

```text
/reports/:scanId
```

Load:

- scan from `dependency_scans`
- items from `dependency_scan_items`
- project info from `projects`

Display:

- health score
- summary cards
- risk distribution chart
- update type chart
- dependency type chart
- vulnerability severity chart
- dependency table
- expandable row details

Remove hardcoded report data except for a separate demo route/page.

### 7. Dashboard page

Update dashboard to calculate cards and charts from real Supabase data.

Load:

- projects
- recent scans
- scan items for recent scans if needed

Calculate:

- Total projects
- Total scans
- Average health score
- Critical risks
- High risks
- Packages monitored
- Health score trend over time
- Risk distribution
- Update type distribution
- Top risky packages

Add:

- project filter
- date range filter
- loading state
- empty state

### 8. Projects page

Update Projects page with real CRUD.

Features:

- List projects from Supabase.
- Create project dialog.
- Edit project dialog.
- Delete confirmation dialog.
- Run scan action.
- View latest report action.

When creating a project:

- save `name`, `description`, `package_manager`, `schedule_type`
- optionally save `package_json`

### 9. Scan History page

Load real scan history from Supabase.

Columns:

- Date
- Project
- Health score
- Total dependencies
- Critical risks
- High risks
- Status
- Actions

Actions:

- View report
- Compare with previous scan if available

### 10. Compare Reports page

Implement comparison using real scans and scan items.

Show:

- Previous health score vs current health score
- New risks
- Fixed risks
- Packages upgraded
- Packages downgraded
- New vulnerabilities
- Resolved vulnerabilities

### 11. Settings page

Connect notification settings to Supabase.

Use `notification_settings` table.

Fields:

- email_enabled
- email_address
- discord_enabled
- discord_webhook_url
- slack_enabled
- slack_webhook_url

Actual sending can stay as placeholder for MVP.

### 12. Demo mode

Keep a fallback demo mode only for:

- unauthenticated landing page
- demo report page

Do not use fake hardcoded data on authenticated dashboard, projects, reports, or scan history.

### 13. Error handling

Add consistent error handling:

- Snackbar for common errors
- Friendly empty states
- Loading states
- Retry buttons where useful
- Invalid package.json warning
- Edge Function timeout/error message

### 14. TypeScript models

Create/update TypeScript interfaces:

- Profile
- Project
- DependencyScan
- DependencyScanItem
- NotificationSettings
- ScanReport
- DashboardStats
- ChartData

Make naming consistent between Supabase snake_case columns and Angular camelCase models.

Use mapping helpers if needed.

### 15. Security

- Do not expose service role key.
- Use anon key only in Angular.
- Rely on Supabase RLS.
- Check authenticated user before calling protected operations.
- Do not allow users to fetch scans/projects that are not theirs.

## Expected output

Update the Angular app so the main flow works end-to-end:

```text
Login/Register
  -> Dashboard
  -> Create Project
  -> New Scan
  -> Call analyze-dependencies Edge Function
  -> Save scan in Supabase
  -> View report with real data
  -> Dashboard updates from real scans
```

Generate or update all required Angular services, components, routes, guards, and models.
