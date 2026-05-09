# Ideas

## Optional AI release summaries

Keep the first production path free by using npm metadata, OSV, GitHub Releases, and public changelog extraction.

Later, add an optional AI summarizer for release notes:

- Store `OPENAI_API_KEY` only as a Supabase Edge Function secret.
- Run AI only for high, critical, vulnerable, deprecated, or major-update packages.
- Cache summaries in `dependency_scan_items.release_insights` to avoid repeated cost.
- Prefer a low-cost model first, then expose model choice through environment settings.
