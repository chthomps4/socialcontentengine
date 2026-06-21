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

export function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function nextWeekStart(runDateText) {
  const currentWeekStart = startOfWeek(runDateText);
  return addDays(currentWeekStart, 7);
}

export function filterPostsByDateRange(posts, startDate, endDate) {
  return posts
    .map(normalizePost)
    .filter((post) => post.date >= startDate && post.date <= endDate)
    .sort((a, b) => `${a.date}${a.platform}${a.id}`.localeCompare(`${b.date}${b.platform}${b.id}`));
}

export function filterPostsByWeek(posts, weekStart) {
  return filterPostsByDateRange(posts, weekStart, addDays(weekStart, 6));
}

function topPerformer(posts, key) {
  return aggregateBy(posts, key)[0] || null;
}

function bestConversionPost(posts) {
  return posts
    .map(normalizePost)
    .sort((a, b) => numeric(b.conversions) - numeric(a.conversions) || numeric(b.clicks) - numeric(a.clicks))[0] || null;
}

function weekSeedContext(posts, weekStart) {
  const priorPosts = filterPostsByDateRange(posts, '0000-01-01', addDays(weekStart, -1));
  const pillar = topPerformer(priorPosts, 'content_pillar')?.name || 'systems';
  const campaign = topPerformer(priorPosts, 'campaign')?.name || 'social-content-ops';
  const conversionPost = bestConversionPost(priorPosts);

  return {
    pillar,
    campaign,
    conversionPlatform: conversionPost?.platform || 'newsletter',
    pillarHookLabel: pillar === 'newsletter' ? 'clear conversion-focused content' : `${pillar} posts`,
    pillarHookVerb: pillar === 'newsletter' ? 'does' : 'do',
    conversionCta: conversionPost?.cta || 'Reply with the workflow gap you want cleaned up next.'
  };
}

function weekSeedTemplates(context) {
  const campaignSlug = `social-content-ops-week-of`;
  return [
    {
      platform: 'LinkedIn',
      pillar: 'systems',
      hook: `The next content week should start with the lesson that ${context.pillarHookLabel} still ${context.pillarHookVerb} the heaviest lifting.`,
      body_copy: `The clearest signal from recent content is that practical operations themes keep earning attention because they give people a usable next step. This week's opening draft leans into that: keep the system visible, keep the workflow simple, and let every post earn its place in the weekly pack.`,
      cta: 'Audit one part of your content system before Monday ends.',
      image_concept: 'Weekly operations board reset with top-performing content notes',
      image_prompt: 'Professional editorial workspace showing a weekly content operations board reset for a new week, analytics notes highlighting top-performing practical content themes, clean calendar, polished small business style, no readable text',
      alt_text: 'A weekly content operations board reset for a new week with analytics notes and planning cards.',
      hashtags: '#ContentOps #SystemsThinking #BusinessSignalWorkshop',
      campaign: `${campaignSlug}-systems`
    },
    {
      platform: 'Instagram',
      pillar: 'behind-the-scenes',
      hook: 'Behind-the-scenes content lands better when it shows the decision, not just the setup.',
      body_copy: `One of the strongest recurring signals this month is that people save the process when they can see how a rough idea becomes a real content asset. Today's draft shows the handoff from review notes to copy, prompts, and filenames so the workflow feels repeatable instead of mysterious.`,
      cta: 'Save this as a model for your next weekly prep session.',
      image_concept: 'Founder turning review notes into content drafts and image prompts',
      image_prompt: 'Bright documentary-style photo of a founder turning review notes into content drafts, image prompts, and asset filenames at a tidy desk, natural light, practical editorial style, no readable text',
      alt_text: 'A founder turning review notes into content drafts, prompts, and filenames at a desk.',
      hashtags: '#FounderWorkflow #ContentPlanning #BehindTheScenes',
      campaign: `${campaignSlug}-workflow`
    },
    {
      platform: 'Facebook',
      pillar: 'education',
      hook: 'The approval queue gets lighter when the review criteria are clearer.',
      body_copy: `Most weekly bottlenecks are not caused by missing software. They come from unclear claims, weak proof, or assets that are not tied cleanly to the post record. This draft teaches a short review checklist that keeps human approval fast without turning the process into a heavyweight CMS.`,
      cta: 'Comment with the review check that saves you the most time.',
      image_concept: 'Short approval checklist tied to draft posts and asset references',
      image_prompt: 'Warm realistic workspace showing a short approval checklist tied to draft social posts, asset references, and a weekly planner, approachable operations style, no readable text',
      alt_text: 'A short approval checklist sits beside draft posts, asset references, and a weekly planner.',
      hashtags: '#ContentReview #MarketingSystems #SmallBusinessOps',
      campaign: `${campaignSlug}-approval`
    },
    {
      platform: 'X',
      pillar: 'quick-tip',
      hook: 'Quick ops rule: if the handoff needs explanation, the filename probably does too.',
      body_copy: `The file structure should tell you what the asset is before you open it. Date, brand, platform, campaign, pillar, and post ID are enough to keep review, design, and reporting aligned later. Small naming discipline removes a surprising amount of weekly friction.`,
      cta: 'Use the naming pattern on your next asset batch.',
      image_concept: 'Asset folder naming system aligned with planning and reporting',
      image_prompt: 'Minimal desktop workspace inspired by neatly organized asset folders aligned with planning and reporting workflows, clean neutral interface, no readable text',
      alt_text: 'Organized asset folders aligned with planning and reporting workflows.',
      hashtags: '#AssetManagement #ContentOps #Workflow',
      campaign: `${campaignSlug}-assets`
    },
    {
      platform: 'Reddit',
      pillar: 'community',
      hook: `What part of your content workflow improved after you started tracking ${context.conversionPlatform} results more closely?`,
      body_copy: `The most useful metric is the one that changes the next draft or the next checklist. Recent results suggest conversion-oriented content can reveal a lot about where the workflow is actually helping. I'm curious which metric has made you rewrite a template, tighten an approval step, or cut a content angle entirely.`,
      cta: 'Share the metric and the workflow change it triggered.',
      image_concept: 'Community discussion setup about content metrics and workflow changes',
      image_prompt: 'Realistic tabletop scene with a laptop, notebook, analytics sketch, and a community discussion setup about content metrics changing workflow decisions, thoughtful research mood, no readable text',
      alt_text: 'A laptop and notebook prepared for a discussion about content metrics and workflow changes.',
      hashtags: '#CommunityResearch #ContentStrategy #Operations',
      campaign: `${campaignSlug}-community`
    },
    {
      platform: 'newsletter',
      pillar: 'newsletter',
      hook: `${context.conversionPlatform} results usually improve when the message closes one loop cleanly.`.replace(/^newsletter/, 'Newsletter'),
      body_copy: `The best-performing conversion path in the current sample reinforces a simple rule: one practical takeaway, one obvious response path, and no extra clutter. This week's newsletter draft follows that pattern so the reader can identify the workflow gap and respond without hunting for the point.`,
      cta: context.conversionCta,
      image_concept: 'Calm newsletter drafting desk built around one clear operational takeaway',
      image_prompt: 'Editorial planning desk with a drafted newsletter, tidy calendar, and one clear operational takeaway highlighted, premium but practical style, no readable text',
      alt_text: 'A calm planning desk with a newsletter draft and one clear operational takeaway.',
      hashtags: '#NewsletterOps #ContentSystems #BusinessSignalWorkshop',
      campaign: `${campaignSlug}-newsletter`
    },
    {
      platform: 'LinkedIn',
      pillar: 'metrics',
      hook: 'A weekly report earns its keep when it changes the next seven rows.',
      body_copy: `Reporting should narrow the next decision set: repeat, refine, or retire. This week's closing draft turns recent content results into a small planning rule for the next week so the report stays connected to the calendar instead of becoming a dead-end recap.`,
      cta: 'Pick one angle to repeat and one to retire next week.',
      image_concept: 'Metrics review board translating report insights into next-week draft choices',
      image_prompt: 'Clean business analytics scene with a metrics review board translating report insights into next-week draft choices, planning cards, modern editorial style, no readable text',
      alt_text: 'A metrics review board translating report insights into next-week draft choices.',
      hashtags: '#MarketingAnalytics #WeeklyReview #ContentStrategy',
      campaign: `${campaignSlug}-metrics`
    }
  ];
}

export function seedWeekPosts(posts, weekStart) {
  const context = weekSeedContext(posts, weekStart);
  const createdAt = new Date().toISOString();

  return weekSeedTemplates(context).map((template, index) => {
    const date = addDays(weekStart, index);
    const platformSlug = slugify(template.platform);
    return normalizePost({
      id: `bsw-${date}-${platformSlug}`,
      date,
      brand_business: 'Business Signal Workshop',
      campaign: template.campaign,
      content_pillar: template.pillar,
      platform: template.platform,
      hook: template.hook,
      body_copy: template.body_copy,
      cta: template.cta,
      image_concept: template.image_concept,
      image_prompt: template.image_prompt,
      alt_text: template.alt_text,
      hashtags: template.hashtags,
      approval_status: 'pending_review',
      publishing_status: 'not_scheduled',
      final_url: '',
      metrics: '{}',
      impressions: '0',
      engagements: '0',
      clicks: '0',
      saves: '0',
      comments: '0',
      shares: '0',
      conversions: '0',
      created_at: createdAt,
      updated_at: createdAt
    });
  });
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

export function summarizeMetrics(posts) {
  const totals = posts.map(normalizePost).reduce((summary, post) => {
    summary.posts += 1;
    summary.impressions += numeric(post.impressions);
    summary.engagements += numeric(post.engagements);
    summary.clicks += numeric(post.clicks);
    summary.conversions += numeric(post.conversions);
    return summary;
  }, {
    posts: 0,
    impressions: 0,
    engagements: 0,
    clicks: 0,
    conversions: 0
  });

  const engagementRate = totals.impressions ? ((totals.engagements / totals.impressions) * 100).toFixed(1) : '0.0';
  return {
    ...totals,
    engagement_rate: `${engagementRate}%`
  };
}

export function generatePullRequestBody({
  weekStart,
  filesChanged = [],
  weekPosts = [],
  approvalQueueCount = 0,
  imagePromptBatchLocation = '',
  metricsSummary = {},
  testsRun = [],
  assumptions = [],
  backlog = []
}) {
  const summary = [
    `Prepared ${weekPosts.length} review-ready drafts for the week of ${weekStart}.`,
    approvalQueueCount > 0
      ? `${approvalQueueCount} items remain in the approval queue for human review.`
      : 'No pending approval items were generated.'
  ];

  const metricLine = metricsSummary.posts
    ? `Imported metrics across ${metricsSummary.posts} prior posts: ${metricsSummary.impressions} impressions, ${metricsSummary.engagements} engagements, ${metricsSummary.clicks} clicks, ${metricsSummary.conversions} conversions, ${metricsSummary.engagement_rate} engagement rate.`
    : 'No metrics source was available to import this run.';

  const sections = [
    `## Summary`,
    '',
    ...summary.map((line) => `- ${line}`),
    '',
    `## Files Changed`,
    '',
    ...filesChanged.map((file) => `- ${file}`),
    '',
    `## Approval Queue Count`,
    '',
    `- ${approvalQueueCount}`,
    '',
    `## Image Prompt Batch Location`,
    '',
    `- ${imagePromptBatchLocation || 'Not generated'}`,
    '',
    `## Metrics/Report Summary`,
    '',
    `- ${metricLine}`,
    '',
    `## Tests Run`,
    '',
    ...testsRun.map((item) => `- ${item}`),
    '',
    `## Assumptions`,
    '',
    ...assumptions.map((item) => `- ${item}`),
    '',
    `## Next-Step Backlog`,
    '',
    ...backlog.map((item) => `- ${item}`)
  ];

  return `${sections.join('\n').trim()}\n`;
}

export async function readTemplate(filePath) {
  return readFile(filePath, 'utf8');
}

export async function writeText(filePath, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text, 'utf8');
}
