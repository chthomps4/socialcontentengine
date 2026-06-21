export const PLATFORMS = [
  'Facebook',
  'Instagram',
  'LinkedIn',
  'X',
  'Reddit',
  'newsletter'
];

export const APPROVAL_STATUSES = [
  'idea',
  'draft',
  'pending_review',
  'approved',
  'needs_changes',
  'rejected'
];

export const PUBLISHING_STATUSES = [
  'not_scheduled',
  'scheduled',
  'published',
  'skipped'
];

export const CONTENT_HEADERS = [
  'id',
  'date',
  'brand_business',
  'campaign',
  'content_pillar',
  'platform',
  'hook',
  'body_copy',
  'cta',
  'image_concept',
  'image_prompt',
  'alt_text',
  'hashtags',
  'asset_filename',
  'approval_status',
  'publishing_status',
  'final_url',
  'metrics',
  'impressions',
  'engagements',
  'clicks',
  'saves',
  'comments',
  'shares',
  'conversions',
  'created_at',
  'updated_at'
];

export const IMAGE_PROMPT_HEADERS = [
  'post_id',
  'date',
  'brand_business',
  'platform',
  'asset_filename',
  'image_concept',
  'image_prompt',
  'alt_text'
];

export const METRIC_HEADERS = [
  'post_id',
  'final_url',
  'impressions',
  'engagements',
  'clicks',
  'saves',
  'comments',
  'shares',
  'conversions',
  'metrics_notes'
];

export const DEFAULT_CONTENT_PATH = process.env.SCE_DATA_PATH || 'data/content_calendar.csv';
export const DEFAULT_EXPORT_DIR = process.env.SCE_EXPORT_DIR || 'exports';
export const DEFAULT_METRICS_PATH = 'data/weekly_metrics_sample.csv';

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'untitled';
}
