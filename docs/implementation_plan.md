# Implementation Plan

## Phase 1 - Lightweight Operations Core

- Store content calendar rows in `data/content_calendar.csv`.
- Keep reference selectors in CSV files for brands, platforms, and content pillars.
- Provide a database-ready SQLite schema in `db/schema.sql`.
- Add scripts for validation, CSV export, Markdown review export, image prompt export, approval queue export, metrics import, and theme reporting.
- Keep publishing human-gated with approval and publishing statuses.

## Phase 2 - Weekly Automation Flow

- Run Codex every Sunday.
- Create a branch named `codex/social-content-week-of-YYYY-MM-DD`.
- Generate the following week's draft pack, image prompt batch, approval queue, and theme report.
- Commit generated changes to the branch.
- Open a draft PR against `main` for human review.

## Phase 3 - API-Ready Scheduling Layer

- Use `api/scheduler_payload.schema.json` as the contract for future scheduling tools.
- Only send rows with `approval_status=approved`.
- Keep scheduler API keys in environment variables.
- Record returned URLs and posting status back into the content calendar.

## Phase 4 - Reporting Improvements

- Import platform metrics weekly.
- Track performance by campaign, content pillar, platform, and brand/business.
- Feed top-performing themes into the next weekly prompt.
