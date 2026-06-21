import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterPostsByWeek,
  approvalQueue,
  buildAssetFilename,
  generatePullRequestBody,
  generateThemeReport,
  mergeMetrics,
  nextWeekStart,
  seedWeekPosts,
  startOfWeek,
  summarizeMetrics,
  validatePosts
} from '../src/content.mjs';

const basePost = {
  id: 'bsw-test-linkedin',
  date: '2026-06-01',
  brand_business: 'Business Signal Workshop',
  campaign: 'Launch Week',
  content_pillar: 'systems',
  platform: 'LinkedIn',
  hook: 'A practical hook',
  body_copy: 'Draft copy for review.',
  cta: 'Review the workflow.',
  image_concept: 'Dashboard',
  image_prompt: 'Clean dashboard image',
  alt_text: 'Dashboard image',
  hashtags: '#ContentOps',
  approval_status: 'pending_review',
  publishing_status: 'not_scheduled',
  impressions: '0',
  engagements: '0',
  clicks: '0',
  saves: '0',
  comments: '0',
  shares: '0',
  conversions: '0'
};

test('asset filenames are deterministic and traceable', () => {
  assert.equal(
    buildAssetFilename(basePost),
    'assets/images/business-signal-workshop/2026/06/2026-06-01_business-signal-workshop_linkedin_launch-week_systems_bsw-test-linkedin.png'
  );
});

test('approval queue includes pending review drafts', () => {
  const queue = approvalQueue([basePost, { ...basePost, id: 'approved', approval_status: 'approved' }]);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 'bsw-test-linkedin');
});

test('validation blocks published posts without approval', () => {
  const errors = validatePosts([{ ...basePost, publishing_status: 'published' }]);
  assert.match(errors.join('\n'), /cannot be published without approval/);
});

test('metrics import updates matching posts and report ranks themes', () => {
  const updated = mergeMetrics([basePost], [{
    post_id: 'bsw-test-linkedin',
    final_url: 'https://example.com/post',
    impressions: '100',
    engagements: '25',
    clicks: '10',
    saves: '2',
    comments: '3',
    shares: '4',
    conversions: '1',
    metrics_notes: 'Strong test result'
  }]);

  assert.equal(updated[0].final_url, 'https://example.com/post');
  assert.equal(updated[0].engagements, '25');
  assert.match(generateThemeReport(updated), /systems/);
  assert.match(generateThemeReport(updated), /25.0%/);
});

test('week filter scopes content to seven days from week start', () => {
  const rows = [
    basePost,
    { ...basePost, id: 'in-week', date: '2026-06-07' },
    { ...basePost, id: 'out-of-week', date: '2026-06-08' }
  ];

  const filtered = filterPostsByWeek(rows, '2026-06-01');
  assert.deepEqual(filtered.map((post) => post.id), ['bsw-test-linkedin', 'in-week']);
});

test('week helpers resolve monday starts and next week from run date', () => {
  assert.equal(startOfWeek('2026-06-14'), '2026-06-08');
  assert.equal(nextWeekStart('2026-06-14'), '2026-06-15');
  assert.equal(nextWeekStart('2026-06-15'), '2026-06-22');
});

test('missing weeks can be seeded into a seven-day pending review pack', () => {
  const seeded = seedWeekPosts([{
    ...basePost,
    impressions: '100',
    engagements: '30',
    conversions: '4'
  }], '2026-06-15');

  assert.equal(seeded.length, 7);
  assert.equal(seeded[0].date, '2026-06-15');
  assert.equal(seeded[6].date, '2026-06-21');
  assert.ok(seeded.every((post) => post.approval_status === 'pending_review'));
  assert.ok(seeded.every((post) => post.publishing_status === 'not_scheduled'));
});

test('weekly seed hook uses singular verb for newsletter-led context', () => {
  const seeded = seedWeekPosts([{
    ...basePost,
    content_pillar: 'newsletter',
    platform: 'newsletter',
    impressions: '100',
    engagements: '30',
    conversions: '4'
  }], '2026-06-15');

  assert.match(seeded[0].hook, /content still does the heaviest lifting/);
});

test('metrics summary and PR body include required weekly fields', () => {
  const metricsSummary = summarizeMetrics([{
    ...basePost,
    impressions: '200',
    engagements: '50',
    clicks: '12',
    conversions: '3'
  }]);

  const prBody = generatePullRequestBody({
    weekStart: '2026-06-08',
    filesChanged: ['data/content_calendar.csv'],
    weekPosts: [basePost],
    approvalQueueCount: 1,
    imagePromptBatchLocation: 'exports/weeks/2026-06-08/image_prompts.csv',
    metricsSummary,
    testsRun: ['npm test'],
    assumptions: ['Generated drafts remain pending_review.'],
    backlog: ['Add PR automation.']
  });

  assert.match(prBody, /## Summary/);
  assert.match(prBody, /## Files Changed/);
  assert.match(prBody, /## Approval Queue Count/);
  assert.match(prBody, /## Image Prompt Batch Location/);
  assert.match(prBody, /## Metrics\/Report Summary/);
  assert.match(prBody, /25.0% engagement rate/);
});
