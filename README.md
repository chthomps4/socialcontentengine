# socialcontentengine

Lightweight social content operations for Business Signal Workshop and umbrella businesses.

This repo stores weekly content ideas, post drafts, platform variants, image prompts, asset filenames, approval status, publishing status, and performance metrics. It is designed to prepare review-ready content packs without auto-publishing.

## What It Does

- Keeps the content calendar in `data/content_calendar.csv`
- Defines database-ready schema in `db/schema.sql`
- Tracks brand/business, campaign, pillar, platform, draft copy, image prompts, approval status, publishing status, URLs, and metrics
- Exports CSV, Markdown review packs, approval queues, image prompt batches, and performance reports
- Imports weekly metrics back into the content calendar
- Provides prompt templates for weekly and daily content generation
- Documents a GitHub branch and PR workflow for weekly automation runs

## Quick Start

Requirements:

- Node.js 20 or newer
- npm, only for running package scripts

Install dependencies:

```bash
npm install
```

This project currently uses only Node built-ins, so install is quick.

Run tests:

```bash
npm test
```

Validate the seed calendar:

```bash
npm run validate
```

Generate review assets:

```bash
npm run export:markdown
npm run export:image-prompts
npm run report
npm run prepare:week
```

Outputs are written to `exports/`.
Weekly automation artifacts are written to `exports/weeks/YYYY-MM-DD/`.

## Common Commands

```bash
npm run approval:queue
npm run export:csv
npm run export:markdown
npm run export:image-prompts
npm run import:metrics
npm run daily-pack
npm run prepare:week
npm run report
```

You can pass file paths directly to the CLI:

```bash
node scripts/socialcontentengine.mjs export-markdown --source data/content_calendar.csv --out exports/content_review.md
node scripts/socialcontentengine.mjs import-metrics --source data/content_calendar.csv --metrics data/weekly_metrics_sample.csv --out data/content_calendar.csv
node scripts/socialcontentengine.mjs prepare-week --source data/content_calendar.csv
node scripts/socialcontentengine.mjs prepare-week --source data/content_calendar.csv --run-date 2026-06-14
node scripts/socialcontentengine.mjs prepare-week --source data/content_calendar.csv --week-start 2026-06-15
```

## Data Model

Primary CSV table: `data/content_calendar.csv`

Core fields:

- `date`
- `brand_business`
- `campaign`
- `content_pillar`
- `platform`
- `hook`
- `body_copy`
- `cta`
- `image_concept`
- `image_prompt`
- `alt_text`
- `hashtags`
- `asset_filename`
- `approval_status`
- `publishing_status`
- `final_url`
- `metrics`
- `impressions`
- `engagements`
- `clicks`
- `saves`
- `comments`
- `shares`
- `conversions`

Reference tables:

- `data/brands.csv`
- `data/platforms.csv`
- `data/content_pillars.csv`

Future database migration:

- `db/schema.sql`

## Approval And Publishing Rule

The system never auto-publishes. Every generated draft should remain `pending_review` until a human changes `approval_status` to `approved`.

Recommended statuses:

- Approval: `idea`, `draft`, `pending_review`, `approved`, `needs_changes`, `rejected`
- Publishing: `not_scheduled`, `scheduled`, `published`, `skipped`

## Weekly Automation Workflow

The Codex automation should run every Sunday and prepare the following week.

Recommended branch naming:

```text
codex/social-content-week-of-YYYY-MM-DD
```

Recommended PR title:

```text
Prepare social content ops for week of YYYY-MM-DD
```

The PR should include:

- Files changed
- Next week's content pack
- Approval queue
- Image prompt batch
- Metrics/report summary
- Test results
- Risks and assumptions

See `docs/github_workflow.md` for the full flow.

## Weekly Package Output

The `prepare-week` command generates a review bundle for a single Monday-start week:

- `exports/weeks/YYYY-MM-DD/content_review.md`
- `exports/weeks/YYYY-MM-DD/daily_content_pack.md`
- `exports/weeks/YYYY-MM-DD/image_prompts.csv`
- `exports/weeks/YYYY-MM-DD/approval_queue.md`
- `exports/weeks/YYYY-MM-DD/theme_report.md`
- `exports/weeks/YYYY-MM-DD/content_calendar.csv`
- `exports/weeks/YYYY-MM-DD/pull_request.md`

This keeps the current calendar in `data/content_calendar.csv` while giving reviewers a stable, week-scoped artifact set.

If `--week-start` is omitted, the CLI computes the following Monday from the run date and seeds that week into `data/content_calendar.csv` when rows do not already exist.

## Environment Variables

Copy `.env.example` if you later connect scheduling or analytics APIs.

```bash
cp .env.example .env
```

Secrets should stay in environment variables. Do not commit `.env`.

## Folder Structure

```text
api/                 API-ready schemas for future scheduling tools
assets/images/       Final image assets using documented naming conventions
data/                CSV content calendar, reference data, and seed metrics
db/                  SQL schema
docs/                Implementation plan, workflow, schema, backlog
exports/             Generated review packs and reports
prompts/             Prompt templates for content generation
scripts/             CLI wrappers
src/                 Core engine
test/                Node test runner tests
```

## Next Steps

See `docs/backlog.md` for the planned improvements.
