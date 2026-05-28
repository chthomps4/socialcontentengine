CREATE TABLE IF NOT EXISTS brands (
  brand_slug TEXT PRIMARY KEY,
  brand_business TEXT NOT NULL,
  business_type TEXT,
  voice_notes TEXT,
  primary_audience TEXT,
  default_cta TEXT
);

CREATE TABLE IF NOT EXISTS platforms (
  platform TEXT PRIMARY KEY,
  max_length INTEGER,
  content_notes TEXT,
  requires_approval INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS content_calendar (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  brand_business TEXT NOT NULL,
  campaign TEXT,
  content_pillar TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('Facebook', 'Instagram', 'LinkedIn', 'X', 'Reddit', 'newsletter')),
  hook TEXT NOT NULL,
  body_copy TEXT NOT NULL,
  cta TEXT,
  image_concept TEXT,
  image_prompt TEXT,
  alt_text TEXT,
  hashtags TEXT,
  asset_filename TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (approval_status IN ('idea', 'draft', 'pending_review', 'approved', 'needs_changes', 'rejected')),
  publishing_status TEXT NOT NULL DEFAULT 'not_scheduled'
    CHECK (publishing_status IN ('not_scheduled', 'scheduled', 'published', 'skipped')),
  final_url TEXT,
  metrics TEXT DEFAULT '{}',
  impressions INTEGER NOT NULL DEFAULT 0,
  engagements INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (publishing_status != 'published' OR approval_status = 'approved')
);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES content_calendar(id),
  week_start TEXT NOT NULL,
  final_url TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  engagements INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  metrics_notes TEXT,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_date ON content_calendar(date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_brand ON content_calendar(brand_business);
CREATE INDEX IF NOT EXISTS idx_content_calendar_platform ON content_calendar(platform);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(approval_status, publishing_status);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_post ON metric_snapshots(post_id);
