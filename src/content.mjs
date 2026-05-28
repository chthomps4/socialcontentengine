import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  APPROVAL_STATUSES,
  CONTENT_HEADERS,
  DEFAULT_CONTENT_PATH,
  IMAGE_PROMPT_HEADERS,
  METRIC_HEADERS,
  PLATFORMS,
  PUBLISHING_STATUSES,
  slugify
} from './config.mjs';
import { objectsToCsv, readCsvObjects, writeCsvObjects } from './csv.mjs';

export function numeric(value) {
  const parsed = Number.parseInt(String(value ?? '0').replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizePost(row) {
  const normalized = {};
  CONTENT_HEADERS.forEach((header) => {
    normalized[header] = row[header] ?? '';
  });

  normalized.approval_status = normalized.approval_status || 'pending_review';
  normalized.publishing_status = normalized.publishing_status || 'not_scheduled';
  normalized.metrics = normalized.metrics || '{}';

  for (const field of ['impressions', 'engagements', 'clicks', 'saves', 'comments', 'shares', 'conversions']) {
    normalized[field] = String(numeric(normalized[field]));
  }

  if (!normalized.asset_filename) {
    normalized.asset_filename = buildAssetFilename(normalized);
  }

  return normalized;
}

export function validatePost(post) {
  const errors = [];
  const requiredFields = ['id', 'date', 'brand_business', 'content_pillar', 'platform', 'hook', 'body_copy', 'approval_status', 'publishing_status'];

  for (const field of requiredFields) {
    if (!post[field]) {
      errors.push(`${post.id || 'missing-id'} is missing ${field}`);
    }
  }

  if (post.platform && !PLATFORMS.includes(post.platform)) {
    errors.push(`${post.id} uses unsupported platform "${post.platform}"`);
  }

  if (post.approval_status && !APPROVAL_STATUSES.includes(post.approval_status)) {
    errors.push(`${post.id} uses unsupported approval_status "${post.approval_status}"`);
  }

  if (post.publishing_status && !PUBLISHING_STATUSES.includes(post.publishing_status)) {
    errors.push(`${post.id} uses unsupported publishing_status "${post.publishing_status}"`);
  }

  if (post.publishing_status === 'published' && post.approval_status !== 'approved') {
    errors.push(`${post.id} cannot be published without approval`);
  }

  return errors;
}

export function validatePosts(posts) {
  return posts.flatMap((post) => validatePost(normalizePost(post)));
}

export function buildAssetFilename(post) {
  const date = post.date || 'undated';
  const year = date.slice(0, 4) || 'yyyy';
  const month = date.slice(5, 7) || 'mm';
  const brand = slugify(post.brand_business);
  const platform = slugify(post.platform);
  const campaign = slugify(post.campaign);
  const pillar = slugify(post.content_pillar);
  const id = slugify(post.id);

  return `assets/images/${brand}/${year}/${month}/${date}_${brand}_${platform}_${campaign}_${pillar}_${id}.png`;
}

export async function loadContent(filePath = DEFAULT_CONTENT_PATH) {
  const rows = await readCsvObjects(filePath);
  return rows.map(normalizePost);
}

export async function saveContent(filePath, posts) {
  const normalized = posts.map(normalizePost);
  await writeCsvObjects(filePath, normalized, CONTENT_HEADERS);
}

export function approvalQueue(posts) {
  return posts
    .map(normalizePost)
    .filter((post) => ['draft', 'pending_review', 'needs_changes'].includes(post.approval_status))
    .sort((a, b) => `${a.date}${a.platform}`.localeCompare(`${b.date}${b.platform}`));
}

export function generateMarkdownReview(posts, options = {}) {
  const title = options.title || 'Social Content Review Pack';
  const normalized = posts.map(normalizePost);
  const lines = [`# ${title}`, '', `Generated for ${options.weekLabel || 'current content calendar'}.`, ''];

  const grouped = groupBy(normalized, (post) => post.date);
  for (const [date, dayPosts] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${date}`, '');
    dayPosts.forEach((post) => {
      lines.push(`### ${post.brand_business} - ${post.platform}`);
      lines.push('');
      lines.push(`- ID: ${post.id}`);
      lines.push(`- Campaign: ${post.campaign}`);
      lines.push(`- Pillar: ${post.content_pillar}`);
      lines.push(`- Approval: ${post.approval_status}`);
      lines.push(`- Publishing: ${post.publishing_status}`);
      lines.push(`- Asset: ${post.asset_filename}`);
      lines.push('');
      lines.push(`**Hook:** ${post.hook}`);
      lines.push('');
      lines.push(post.body_copy);
      lines.push('');
      lines.push(`**CTA:** ${post.cta}`);
      lines.push('');
      lines.push(`**Image concept:** ${post.image_concept}`);
      lines.push('');
      lines.push(`**Image prompt:** ${post.image_prompt}`);
      lines.push('');
      lines.push(`**Alt text:** ${post.alt_text}`);
      lines.push('');
      lines.push(`**Hashtags:** ${post.hashtags}`);
      lines.push('');
    });
  }

  return `${lines.join('\n').trim()}\n`;
}

function groupBy(items, keySelector) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = keySelector(item);
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  });
  return grouped;
}

export function renderTemplate(template, variables) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => variables[key] ?? '');
}

export function generateDailyContentPack(posts, template, variables = {}) {
  const review = generateMarkdownReview(posts, {
    title: variables.title || 'Daily Content Pack',
    weekLabel: variables.week_start ? `week of ${variables.week_start}` : 'upcoming week'
  });

  return `${renderTemplate(template, variables).trim()}\n\n---\n\n${review}`;
}

export function imagePromptRows(posts) {
  return posts.map(normalizePost).map((post) => ({
    post_id: post.id,
    date: post.date,
    brand_business: post.brand_business,
    platform: post.platform,
    asset_filename: post.asset_filename,
    image_concept: post.image_concept,
    image_prompt: post.image_prompt,
    alt_text: post.alt_text
  }));
}

export function imagePromptCsv(posts) {
  return objectsToCsv(imagePromptRows(posts), IMAGE_PROMPT_HEADERS);
}

export function mergeMetrics(posts, metricsRows) {
  const metricsByPost = new Map(metricsRows.map((row) => [row.post_id || row.id, row]));

  return posts.map((post) => {
    const normalized = normalizePost(post);
    const metrics = metricsByPost.get(normalized.id);
    if (!metrics) {
      return normalized;
    }

    const updated = { ...normalized };
    for (const field of METRIC_HEADERS) {
      if (field === 'post_id' || metrics[field] === undefined || metrics[field] === '') {
        continue;
      }
      if (field === 'metrics_notes') {
        updated.metrics = JSON.stringify({ notes: metrics[field] });
      } else {
        updated[field] = field === 'final_url' ? metrics[field] : String(numeric(metrics[field]));
      }
    }
    updated.updated_at = new Date().toISOString();
    return updated;
  });
}

function aggregateBy(posts, key) {
  const aggregates = new Map();
  posts.map(normalizePost).forEach((post) => {
    const name = post[key] || 'Uncategorized';
    const existing = aggregates.get(name) || {
      name,
      posts: 0,
      impressions: 0,
      engagements: 0,
      clicks: 0,
      conversions: 0
    };
    existing.posts += 1;
    existing.impressions += numeric(post.impressions);
    existing.engagements += numeric(post.engagements);
    existing.clicks += numeric(post.clicks);
    existing.conversions += numeric(post.conversions);
    aggregates.set(name, existing);
  });

  return [...aggregates.values()].sort((a, b) => {
    const rateA = a.impressions ? a.engagements / a.impressions : 0;
    const rateB = b.impressions ? b.engagements / b.impressions : 0;
    return rateB - rateA;
  });
}

function markdownTable(rows) {
  const lines = ['| Theme | Posts | Impressions | Engagements | Clicks | Conversions | Engagement rate |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |'];
  rows.forEach((row) => {
    const rate = row.impressions ? `${((row.engagements / row.impressions) * 100).toFixed(1)}%` : '0.0%';
    lines.push(`| ${row.name} | ${row.posts} | ${row.impressions} | ${row.engagements} | ${row.clicks} | ${row.conversions} | ${rate} |`);
  });
  return lines.join('\n');
}

export function generateThemeReport(posts) {
  const normalized = posts.map(normalizePost);
  const byPillar = aggregateBy(normalized, 'content_pillar');
  const byCampaign = aggregateBy(normalized, 'campaign');
  const best = byPillar[0];

  const lines = [
    '# Social Content Performance Report',
    '',
    best
      ? `Top current content pillar: **${best.name}** with ${best.engagements} engagements from ${best.impressions} impressions.`
      : 'No metrics are available yet.',
    '',
    '## By Content Pillar',
    '',
    markdownTable(byPillar),
    '',
    '## By Campaign',
    '',
    markdownTable(byCampaign),
    '',
    '## Notes',
    '',
    '- Engagement rate is calculated as engagements divided by impressions.',
    '- Drafts with no imported metrics remain in the table with zeroes.',
    '- Use this report to adjust next week hooks, pillars, and CTAs.'
  ];

  return `${lines.join('\n').trim()}\n`;
}

export async function readTemplate(filePath) {
  return readFile(filePath, 'utf8');
}

export async function writeText(filePath, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text, 'utf8');
}
