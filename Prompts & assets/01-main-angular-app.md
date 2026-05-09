# 01 - Main Angular App Prompt

Build a modern SaaS-style web application called **Dependency Risk Scanner**.

The application helps developers analyze their project dependencies and understand risks related to outdated packages, security vulnerabilities, deprecated packages, abandoned packages, and risky upgrades.

## Tech stack

- Frontend: Angular, latest stable version
- UI library: Angular Material
- Charts: use a clean chart library compatible with Angular, for example ngx-charts, ng2-charts, Chart.js, or another good Angular-compatible option
- Backend/database/auth: Supabase
- Database: Supabase Postgres
- Authentication: Supabase Auth
- Server-side logic: Supabase Edge Functions
- Scheduled jobs: Supabase Cron, structure only if full implementation is too much
- Package ecosystem for MVP: npm / package.json projects

## Important UI requirement

The app should look like a polished developer SaaS dashboard, not a basic admin panel.

Use Angular Material components properly:

- mat-card
- mat-table
- mat-toolbar
- mat-sidenav
- mat-tabs
- mat-chip
- mat-dialog
- mat-menu
- mat-progress-bar
- mat-progress-spinner
- mat-form-field
- mat-select
- mat-input
- mat-button
- mat-icon
- mat-expansion-panel

Create a responsive layout that works well on desktop, tablet, and mobile.

## Core app idea

Users can create projects, paste or upload a `package.json` file, run a dependency scan, and receive a detailed dependency health report with risk classification, charts, tables, and recommendations.

## Main pages

### 1. Landing page

Create a clean landing page with:

- Hero section
- Product name: Dependency Risk Scanner
- Short value proposition:
  - “Find outdated, vulnerable, deprecated, and risky dependencies before they break your project.”
- CTA buttons:
  - Start scanning
  - View demo report
- Feature cards:
  - Outdated dependency detection
  - Security vulnerability checks
  - Upgrade risk scoring
  - AI-style explanations
  - Scheduled scans
  - Team-ready reports
- Modern dark developer-style visual design

### 2. Authentication pages

Use Supabase Auth.

Create:

- Login page
- Register page
- Forgot password page placeholder

Use Angular Material forms.
Validate email and password fields.
After login, redirect user to dashboard.

### 3. Main app layout

Create a shell layout with:

- Top toolbar
- Left sidebar navigation
- Main content area
- User menu
- Theme toggle: light/dark mode

Sidebar navigation:

- Dashboard
- Projects
- New Scan
- Scan History
- Reports
- Settings

### 4. Dashboard page

Create a visually rich dashboard with cards and charts.

Dashboard cards:

- Total projects
- Total scans
- Average health score
- Critical risks
- High risks
- Packages monitored

Charts:

- Health score trend over time
- Risk distribution chart: low, medium, high, critical
- Dependency update type chart: patch, minor, major
- Top risky packages chart
- Recent scans table

Dashboard should include:

- Date filter: last 7 days, last 30 days, last 90 days
- Project filter
- Loading states
- Empty states

Use mock data first if real data is not available yet, but structure the code so real Supabase data can replace it.

### 5. Projects page

Create a project management page.

Features:

- List projects in a Material table
- Columns:
  - Project name
  - Package manager
  - Last scan date
  - Last health score
  - Critical risks
  - Schedule
  - Actions
- Actions:
  - View report
  - Run scan
  - Edit project
  - Delete project
- Create project dialog
- Edit project dialog

Project fields:

- id
- user_id
- name
- description
- package_manager: npm, yarn, pnpm
- package_json
- lock_file_content optional
- schedule_type: manual, weekly, monthly
- notification_email optional
- discord_webhook_url optional
- slack_webhook_url optional
- created_at
- updated_at

### 6. New Scan page

Create a page where user can run a dependency scan.

Features:

- Select existing project or create a quick temporary scan
- Paste package.json content in a code-like textarea
- Upload package.json file
- Optional upload:
  - package-lock.json
  - yarn.lock
  - pnpm-lock.yaml
- Validate package.json before scan
- Show dependencies count before scan
- Button: Analyze dependencies
- Loading screen while scan runs
- After scan, redirect to Scan Report page

Validation:

- Check if JSON is valid
- Check if dependencies or devDependencies exist
- Show friendly errors using Angular Material snackbar/dialog

### 7. Scan Report page

This is the most important page.

Create a detailed report layout with:

Top summary section:

- Overall dependency health score from 0 to 100
- Big circular/progress visual for score
- Risk label:
  - 90-100 Excellent
  - 75-89 Good
  - 50-74 Needs attention
  - 25-49 Risky
  - 0-24 Critical
- Total dependencies
- Total devDependencies
- Outdated packages
- Vulnerable packages
- Deprecated packages
- Possibly abandoned packages
- Major upgrades available

Charts:

- Risk distribution donut/pie chart
- Update type bar chart: patch, minor, major
- Dependency type chart: dependencies vs devDependencies
- Vulnerability severity chart
- Health score comparison with previous scan, if available

Dependency table:

Use Angular Material table with sorting, pagination, filtering.

Columns:

- Package
- Current version
- Latest version
- Dependency type
- Update type
- Risk level
- Vulnerabilities
- Deprecated
- Last published
- Recommended action
- Actions

Filters:

- Search by package name
- Filter by risk level: low, medium, high, critical
- Filter by dependency type: dependency, devDependency
- Filter by update type: patch, minor, major
- Filter only vulnerable packages
- Filter only deprecated packages

Expandable row details:

When user expands a package row, show:

- Risk explanation
- Why this package may be risky
- Whether the update is probably safe or breaking
- What to test after updating
- Suggested update command
- Links placeholders:
  - npm package page
  - repository
  - changelog
  - vulnerability details

Example row:

```text
Package: lodash
Current: 4.17.15
Latest: 4.17.21
Type: dependency
Update type: patch
Risk: high
Reason: Known vulnerabilities were found for this version.
Recommended action: Update to 4.17.21.
Command: npm install lodash@4.17.21
```

### 8. Scan History page

Create a scan history page.

Features:

- Material table with all scans
- Columns:
  - Date
  - Project
  - Health score
  - Total dependencies
  - Critical risks
  - High risks
  - Status
  - Actions
- Action: View report
- Action: Compare with previous scan
- Empty state if no scans exist

### 9. Compare Reports page

Create a report comparison page.

Compare two scans from the same project:

- Previous health score vs current health score
- New risks
- Fixed risks
- Packages upgraded
- Packages downgraded
- New vulnerabilities
- Resolved vulnerabilities

Show comparison cards and a table.

### 10. Settings page

Create app settings.

Sections:

- Account settings
- Theme settings
- Default scan schedule
- Notification settings
- API/settings placeholder

Notification options:

- Email report
- Discord webhook
- Slack webhook

For MVP, notification fields can be saved to Supabase, but actual sending can be placeholder.

## UI design requirements

Make the UI beautiful and professional.

Visual direction:

- Modern developer SaaS
- Clean dashboard
- Good spacing
- Rounded cards
- Subtle shadows
- Risk colors:
  - low: green
  - medium: amber
  - high: orange
  - critical: red
- Dark mode should look especially good
- Tables should not look crowded
- Use badges/chips for risk levels
- Use skeleton/loading states
- Use empty states with helpful text

## Components to create

Create reusable components:

- AppShellComponent
- SidebarComponent
- TopbarComponent
- StatCardComponent
- RiskBadgeComponent
- HealthScoreComponent
- DependencyTableComponent
- ReportChartsComponent
- FileUploadComponent
- JsonPasteEditorComponent
- ScanLoadingComponent
- EmptyStateComponent
- ConfirmDialogComponent
- ProjectFormDialogComponent

## Angular services

Create services:

- SupabaseService
- AuthService
- ProjectService
- ScanService
- DashboardService
- NotificationSettingsService
- ThemeService

## Routing

Use Angular routing:

- /
- /login
- /register
- /dashboard
- /projects
- /scan/new
- /scans/history
- /reports/:scanId
- /reports/compare/:previousScanId/:currentScanId
- /settings

Protect authenticated routes with an auth guard.

## Mock-first approach

If real npm registry and OSV integration are difficult initially, implement a mock analysis mode first.
However, structure the code so the real Edge Function can replace the mock service later without changing the UI.

## Error handling

Add:

- Snackbar messages
- Friendly error states
- Loading states
- Retry button for failed scans
- Invalid package.json validation message
- Edge Function error handling

## Security notes

- Never expose Supabase service role key in Angular
- Use anon key only in frontend
- Edge Functions should use server-side environment variables
- Use Row Level Security
- Validate all inputs in Edge Functions
- Do not automatically update dependencies
- Do not execute user code
- Do not install packages
- Only analyze metadata

## MVP limitations

For MVP:

- npm ecosystem only
- package.json only required
- lock file optional
- no automatic package updates
- no automatic PR creation
- notification sending can be mocked
- AI explanations can be rule-based first

## Expected output

Generate:

- Complete Angular project structure
- Angular Material setup
- Supabase client setup
- Routing
- Auth pages
- Dashboard with charts
- Project pages
- New scan page
- Scan report page
- Scan history page
- Settings page
- Mock data for demo mode
- Clean and modular code
- Clear instructions for running locally

The final result should be a usable MVP structure, not just static pages.
