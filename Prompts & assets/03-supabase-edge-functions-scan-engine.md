# 03 - Supabase Edge Functions Scan Engine Prompt

Implement the real dependency scan backend for the **Dependency Risk Scanner** app.

## Context

The app is built with:

- Angular
- Angular Material
- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions

## Goal

Create a production-oriented Supabase Edge Function called `analyze-dependencies` that receives a `package.json` file, checks all dependencies and devDependencies, compares versions with the npm registry, checks vulnerabilities using OSV API, calculates risk levels, saves the scan result in Supabase, and returns the full report to the Angular app.

## Edge Function path

```text
supabase/functions/analyze-dependencies/index.ts
```

## Expected endpoint

```text
POST /functions/v1/analyze-dependencies
```

## Input format

```json
{
  "projectId": "uuid or null",
  "packageJson": {
    "dependencies": {},
    "devDependencies": {}
  },
  "lockFileContent": "optional string"
}
```

## Main behavior

1. Validate the request body.
2. Validate that `packageJson` is a valid object.
3. Extract dependencies and devDependencies.
4. Ignore unsupported local packages:
   - `workspace:*`
   - `file:`
   - `link:`
   - git urls
5. For each dependency, extract:
   - packageName
   - currentRange
   - dependencyType: dependency or devDependency
6. For every package, call the npm registry:

```text
https://registry.npmjs.org/{encodedPackageName}
```

7. From npm metadata, extract:
   - `dist-tags.latest`
   - `versions`
   - `time`
   - `deprecated` field for the current version, if present
   - repository url if present
   - homepage if present
8. Clean the current version range:
   - `^1.2.3` -> `1.2.3`
   - `~1.2.3` -> `1.2.3`
   - `>=1.2.3` -> `1.2.3`
   - `1.2.3` -> `1.2.3`
   - if no clean version can be extracted, mark `updateType` as `unknown`
9. Compare current version with latest version using semver-compatible logic.
10. Determine update type:
    - none
    - patch
    - minor
    - major
    - unknown
11. Query OSV API for vulnerabilities:

```text
POST https://api.osv.dev/v1/query
```

Body:

```json
{
  "package": {
    "name": "packageName",
    "ecosystem": "npm"
  },
  "version": "cleanCurrentVersion"
}
```

12. Parse OSV vulnerabilities:
    - id
    - summary
    - severity if available
    - aliases
    - affected ranges if available
13. Detect if package is deprecated.
14. Detect if package is possibly abandoned:
    - if latest publish date is older than 24 months
15. Assign risk level:
    - critical: critical/high vulnerabilities found
    - high: any vulnerability found, deprecated package, or very old major update
    - medium: major update available or possibly abandoned
    - low: patch/minor update only
    - none: no issue found
16. Generate:
    - riskReason
    - recommendedAction
    - updateCommand
    - aiStyleExplanation using rule-based text, not real AI for MVP
17. Calculate health score from 0 to 100:
    - start from 100
    - subtract 25 for each critical package, max sensible cap
    - subtract 15 for each high risk package
    - subtract 8 for each medium risk package
    - subtract 3 for each low risk package
    - never below 0
18. Save a row into `dependency_scans`.
19. Save rows into `dependency_scan_items`.
20. Update the related `projects.last_scan_at` and `projects.last_health_score`.
21. Return:
    - scan
    - items
    - summary counts
    - charts-ready data

## Performance requirements

- Do not create one Edge Function call per package.
- The frontend calls the Edge Function once per scan.
- Inside the function, process dependencies in controlled parallel chunks of 10 packages at a time.
- Add timeouts to external fetch calls.
- Handle npm registry errors gracefully.
- If one package fails, continue scanning the others and mark that package as unknown/error.
- Avoid calling AI for every package.
- AI-style explanations should be rule-based for MVP.

## Security requirements

- Never expose Supabase service role key to Angular.
- Use environment variables inside Edge Function.
- Validate user JWT.
- Make sure the authenticated user can only create scans for their own project.
- Do not execute user code.
- Do not install packages.
- Only analyze public metadata.

## Database

Use existing tables:

- projects
- dependency_scans
- dependency_scan_items

If needed, update the Supabase SQL schema.

## Return object example

```json
{
  "scan": {
    "id": "...",
    "healthScore": 82,
    "totalDependencies": 42,
    "totalDevDependencies": 18,
    "outdatedCount": 12,
    "vulnerableCount": 2,
    "deprecatedCount": 1,
    "abandonedCount": 3,
    "criticalRiskCount": 0,
    "highRiskCount": 2,
    "mediumRiskCount": 6,
    "lowRiskCount": 9
  },
  "items": [
    {
      "packageName": "lodash",
      "currentVersion": "4.17.15",
      "latestVersion": "4.17.21",
      "dependencyType": "dependency",
      "updateType": "patch",
      "riskLevel": "high",
      "isVulnerable": true,
      "vulnerabilities": [],
      "isDeprecated": false,
      "isPossiblyAbandoned": false,
      "lastPublishedAt": "...",
      "riskReason": "Known vulnerabilities were found for this installed version.",
      "recommendedAction": "Update lodash to 4.17.21 and run regression tests.",
      "updateCommand": "npm install lodash@4.17.21",
      "npmUrl": "https://www.npmjs.com/package/lodash",
      "repositoryUrl": "..."
    }
  ],
  "charts": {
    "riskDistribution": [],
    "updateTypes": [],
    "dependencyTypes": [],
    "vulnerabilitySeverity": []
  }
}
```

## Helper modules

Also create helper modules:

```text
supabase/functions/analyze-dependencies/npm-registry.ts
supabase/functions/analyze-dependencies/osv.ts
supabase/functions/analyze-dependencies/semver-utils.ts
supabase/functions/analyze-dependencies/risk-engine.ts
supabase/functions/analyze-dependencies/score.ts
supabase/functions/analyze-dependencies/types.ts
```

### npm-registry.ts

Responsible for:

- fetching npm package metadata
- extracting latest version
- extracting deprecated info
- extracting repository URL
- extracting last published date

### osv.ts

Responsible for:

- querying OSV API
- parsing vulnerability results
- normalizing vulnerability severity

### semver-utils.ts

Responsible for:

- cleaning version ranges
- comparing current and latest versions
- detecting patch/minor/major/unknown updates

### risk-engine.ts

Responsible for:

- assigning package risk level
- generating risk reason
- generating recommended action
- generating rule-based AI-style explanation

### score.ts

Responsible for:

- calculating scan health score
- building summary counts
- building chart-ready data

## Expected output

Generate complete Supabase Edge Function code with modular TypeScript files.
Use clean modular code with TypeScript types.
Add comments where the logic is important.
