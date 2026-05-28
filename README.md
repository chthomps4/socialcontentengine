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
```

Outputs are written to `exports/`.

## Common Commands

```bash
npm run approval:queue
npm run export:csv
npm run export:markdown
npm run export:image-prompts
npm run import:metrics
npm run daily-pack
npm run report
```

You can pass file paths directly to the CLI:

```bash
node scripts/socialcontentengine.mjs export-markdown --source data/content_calendar.csv --out exports/content_review.md
node scripts/socialcontentengine.mjs import-metrics --source data/content_calendar.csv --metrics data/weekly_metrics_sample.csv --out data/content_calendar.csv
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
