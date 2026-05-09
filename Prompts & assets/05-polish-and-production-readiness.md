# 05 - Polish and Production Readiness Prompt

Polish the **Dependency Risk Scanner** app and make it feel like a premium developer SaaS product.

## Context

The app uses:

- Angular
- Angular Material
- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions

The main app, database schema, Edge Function, and frontend connection already exist.

## Goal

Improve UI quality, UX, responsiveness, error handling, empty states, loading states, and code organization.

## Design refinement

Make the UI look like a premium developer SaaS product similar in quality to Linear, Vercel, Sentry, or Supabase dashboards.

Use Angular Material but customize:

- spacing
- typography
- cards
- chips
- tables
- buttons
- side navigation
- toolbar
- dark mode
- charts
- loading states
- empty states

The app should not look like default Angular Material.

## Visual direction

- Modern developer SaaS
- Clean dashboard
- Beautiful cards
- Strong visual hierarchy
- Developer-focused dark mode
- Responsive layout
- Subtle shadows
- Rounded cards
- Clear risk badges
- Good table readability
- Good spacing between sections

Risk colors:

- none: neutral gray
- low: green
- medium: amber
- high: orange
- critical: red

## Pages to polish

### Landing page

Improve:

- hero section
- CTA buttons
- feature cards
- demo preview block
- dark visual style
- responsive mobile view

### Dashboard

Improve:

- stat cards
- chart layout
- recent scans table
- filters
- empty states
- loading skeletons

### Projects page

Improve:

- Material table design
- project cards on mobile
- action menu
- create/edit project dialog
- delete confirmation dialog

### New Scan page

Improve:

- JSON paste area
- file upload UX
- validation messages
- dependency count preview
- scan progress/loading state
- clear CTA

### Report page

This page must be the most polished.

Improve:

- health score visual
- summary cards
- charts
- dependency table
- filters
- expandable rows
- command copy button
- package links
- responsive behavior

### Scan History page

Improve:

- table layout
- comparison action
- empty state
- mobile view

### Settings page

Improve:

- sections
- forms
- notification settings
- theme settings

## UX improvements

Add:

- snackbar messages for actions
- confirmation dialogs for delete actions
- copy-to-clipboard for update commands
- useful empty states
- useful loading states
- disabled buttons during async operations
- retry button after scan failure
- invalid package.json warning
- friendly error messages

## Code quality

Improve:

- reusable components
- consistent TypeScript interfaces
- consistent service method naming
- separation between UI and data access
- route guards
- error handling helpers
- mapping helpers between snake_case Supabase fields and camelCase Angular models

## Accessibility

Add:

- proper button labels
- accessible form labels
- keyboard-friendly dialogs
- semantic headings
- readable contrast in dark mode

## Performance

Improve:

- lazy load routes where useful
- avoid unnecessary Supabase calls
- show cached data while loading when possible
- avoid huge tables without pagination
- use table pagination and filtering correctly

## Final test flow

Make sure this flow works:

1. User registers.
2. User logs in.
3. User creates a project.
4. User pastes a valid package.json.
5. User runs a scan.
6. App calls Supabase Edge Function.
7. Scan saves to Supabase.
8. App redirects to report page.
9. Report shows real data.
10. Dashboard updates.
11. Scan appears in history.
12. User can view project and latest report.
13. User can change schedule settings.
14. User can log out.

## Expected output

Update the app with:

- polished UI
- responsive layout
- better dark mode
- better components
- better empty/loading/error states
- cleaned-up code
- clear final run instructions

Do not rewrite the entire app unnecessarily. Improve the existing implementation.
