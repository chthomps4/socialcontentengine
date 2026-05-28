import assert from 'node:assert/strict';
import test from 'node:test';
import {
  approvalQueue,
  buildAssetFilename,
  generateThemeReport,
  mergeMetrics,
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
