# Schema Design

The current working store is CSV because it is easy to review in pull requests and simple to maintain. The future database schema is in `db/schema.sql`.

## Main Table: content_calendar

One row represents one platform-specific post draft.

Required fields:

- `id`
- `date`
- `brand_business`
- `content_pillar`
- `platform`
- `hook`
- `body_copy`
- `approval_status`
- `publishing_status`

Publishing guardrail:

- A post cannot be `published` unless `approval_status` is `approved`.

## Metrics

The content row stores current metrics for easy reporting. The SQL design also includes `metric_snapshots` for weekly imports over time.

Tracked metrics:

- impressions
- engagements
- clicks
- saves
- comments
- shares
- conversions

## Reference Selectors

- `brands`
- `platforms`
- `content_pillars`

These can become database tables or CMS collections later.
