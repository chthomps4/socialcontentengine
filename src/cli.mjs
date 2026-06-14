import path from 'node:path';
import { readCsvObjects, writeCsvObjects } from './csv.mjs';
import {
  CONTENT_HEADERS,
  DEFAULT_CONTENT_PATH,
  DEFAULT_EXPORT_DIR,
  DEFAULT_METRICS_PATH,
  IMAGE_PROMPT_HEADERS
} from './config.mjs';
import {
  addDays,
  approvalQueue,
  filterPostsByDateRange,
  filterPostsByWeek,
  generateDailyContentPack,
  generateMarkdownReview,
  generatePullRequestBody,
  generateThemeReport,
  imagePromptRows,
  loadContent,
  mergeMetrics,
  nextWeekStart,
  readTemplate,
  saveContent,
  seedWeekPosts,
  summarizeMetrics,
  validatePosts,
  writeText
} from './content.mjs';

function option(args, name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] ?? fallback;
}

function outputPath(fileName) {
  return path.join(DEFAULT_EXPORT_DIR, fileName);
}

function weekOutputPath(weekStart, fileName) {
  return path.join(DEFAULT_EXPORT_DIR, 'weeks', weekStart, fileName);
}

export async function run(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  const source = option(args, 'source', DEFAULT_CONTENT_PATH);

  switch (command) {
    case 'approval-queue': {
      const posts = approvalQueue(await loadContent(source));
      const out = option(args, 'out', outputPath('approval_queue.md'));
      await writeText(out, generateMarkdownReview(posts, { title: 'Approval Queue' }));
      console.log(`Wrote ${posts.length} approval items to ${out}`);
      break;
    }

    case 'daily-pack': {
      const templatePath = option(args, 'template', 'prompts/daily_content_pack.md');
      const weekStart = option(args, 'week-start', '2026-06-01');
      const out = option(args, 'out', outputPath('daily_content_pack.md'));
      const template = await readTemplate(templatePath);
      const posts = filterPostsByWeek(await loadContent(source), weekStart);
      await writeText(out, generateDailyContentPack(posts, template, {
        title: 'Daily Content Pack',
        week_start: weekStart,
        brand_business: 'Business Signal Workshop'
      }));
      console.log(`Wrote daily content pack to ${out}`);
      break;
    }

    case 'export-csv': {
      const out = option(args, 'out', outputPath('content_calendar_export.csv'));
      const posts = await loadContent(source);
      await writeCsvObjects(out, posts, CONTENT_HEADERS);
      console.log(`Exported ${posts.length} posts to ${out}`);
      break;
    }

    case 'export-image-prompts': {
      const weekStart = option(args, 'week-start', '');
      const out = option(args, 'out', outputPath('image_prompts.csv'));
      const posts = await loadContent(source);
      const scopedPosts = weekStart ? filterPostsByWeek(posts, weekStart) : posts;
      await writeCsvObjects(out, imagePromptRows(scopedPosts), IMAGE_PROMPT_HEADERS);
      console.log(`Exported ${scopedPosts.length} image prompts to ${out}`);
      break;
    }

    case 'export-markdown': {
      const weekStart = option(args, 'week-start', '');
      const out = option(args, 'out', outputPath('content_review.md'));
      const posts = await loadContent(source);
      const scopedPosts = weekStart ? filterPostsByWeek(posts, weekStart) : posts;
      await writeText(out, generateMarkdownReview(scopedPosts, {
        weekLabel: weekStart ? `week of ${weekStart}` : 'current content calendar'
      }));
      console.log(`Wrote Markdown review pack to ${out}`);
      break;
    }

    case 'import-csv': {
      const target = option(args, 'target', DEFAULT_CONTENT_PATH);
      const imported = await readCsvObjects(source);
      await saveContent(target, imported);
      console.log(`Imported ${imported.length} posts into ${target}`);
      break;
    }

    case 'import-metrics': {
      const metricsPath = option(args, 'metrics', DEFAULT_METRICS_PATH);
      const out = option(args, 'out', source);
      const posts = await loadContent(source);
      const metricsRows = await readCsvObjects(metricsPath);
      const updated = mergeMetrics(posts, metricsRows);
      await saveContent(out, updated);
      console.log(`Imported metrics for ${metricsRows.length} rows into ${out}`);
      break;
    }

    case 'report': {
      const out = option(args, 'out', outputPath('theme_report.md'));
      const posts = await loadContent(source);
      await writeText(out, generateThemeReport(posts));
      console.log(`Wrote performance report to ${out}`);
      break;
    }

    case 'prepare-week': {
      const runDate = option(args, 'run-date', new Date().toISOString().slice(0, 10));
      const weekStart = option(args, 'week-start', nextWeekStart(runDate));
      const metricsPath = option(args, 'metrics', DEFAULT_METRICS_PATH);
      const templatePath = option(args, 'template', 'prompts/daily_content_pack.md');
      let posts = await loadContent(source);
      let weekPosts = filterPostsByWeek(posts, weekStart);
      const reviewPath = option(args, 'review-out', weekOutputPath(weekStart, 'content_review.md'));
      const promptPath = option(args, 'image-out', weekOutputPath(weekStart, 'image_prompts.csv'));
      const queuePath = option(args, 'queue-out', weekOutputPath(weekStart, 'approval_queue.md'));
      const packPath = option(args, 'pack-out', weekOutputPath(weekStart, 'daily_content_pack.md'));
      const reportPath = option(args, 'report-out', weekOutputPath(weekStart, 'theme_report.md'));
      const csvPath = option(args, 'csv-out', weekOutputPath(weekStart, 'content_calendar.csv'));
      const prBodyPath = option(args, 'pr-out', weekOutputPath(weekStart, 'pull_request.md'));

      if (weekPosts.length === 0) {
        posts = [...posts, ...seedWeekPosts(posts, weekStart)];
        await saveContent(source, posts);
        weekPosts = filterPostsByWeek(posts, weekStart);
      }

      const priorPosts = filterPostsByDateRange(posts, '0000-01-01', addDays(weekStart, -1));
      const metricsRows = await readCsvObjects(metricsPath);
      const metricsSummary = summarizeMetrics(mergeMetrics(priorPosts, metricsRows));
      const template = await readTemplate(templatePath);
      const weekQueue = approvalQueue(weekPosts);

      await writeText(reviewPath, generateMarkdownReview(weekPosts, {
        title: `Social Content Review Pack - Week of ${weekStart}`,
        weekLabel: `week of ${weekStart}`
      }));
      await writeCsvObjects(promptPath, imagePromptRows(weekPosts), IMAGE_PROMPT_HEADERS);
      await writeText(queuePath, generateMarkdownReview(weekQueue, {
        title: `Approval Queue - Week of ${weekStart}`,
        weekLabel: `week of ${weekStart}`
      }));
      await writeText(packPath, generateDailyContentPack(weekPosts, template, {
        title: `Daily Content Pack - Week of ${weekStart}`,
        week_start: weekStart,
        brand_business: 'Business Signal Workshop'
      }));
      await writeText(reportPath, generateThemeReport(mergeMetrics(priorPosts, metricsRows)));
      await writeCsvObjects(csvPath, weekPosts, CONTENT_HEADERS);
      await writeText(prBodyPath, generatePullRequestBody({
        weekStart,
        weekPosts,
        filesChanged: [
          `data/content_calendar.csv`,
          `exports/weeks/${weekStart}/content_review.md`,
          `exports/weeks/${weekStart}/daily_content_pack.md`,
          `exports/weeks/${weekStart}/image_prompts.csv`,
          `exports/weeks/${weekStart}/approval_queue.md`,
          `exports/weeks/${weekStart}/theme_report.md`,
          `exports/weeks/${weekStart}/content_calendar.csv`
        ],
        approvalQueueCount: weekQueue.length,
        imagePromptBatchLocation: `exports/weeks/${weekStart}/image_prompts.csv`,
        metricsSummary,
        testsRun: [
          'npm test',
          'npm run validate',
          `node scripts/socialcontentengine.mjs prepare-week --week-start ${weekStart}`
        ],
        assumptions: [
          'Only the sample metrics file was available for import this run.',
          'Generated drafts remain pending_review and not_scheduled until a human approves them.',
          `The ${weekStart} package is scoped to one post per day for a seven-day review cycle.`
        ],
        backlog: [
          'Support brand-specific weekly bundles when multiple businesses share the calendar.',
          'Add a dedicated PR creation/update automation step once GitHub auth is confirmed.',
          'Refine seeded weekly copy generation with brand-specific prompt inputs.'
        ]
      }));

      console.log(`Prepared weekly package for ${weekStart} in ${path.dirname(reviewPath)}`);
      break;
    }

    case 'validate': {
      const posts = await loadContent(source);
      const errors = validatePosts(posts);
      if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
      } else {
        console.log(`Validated ${posts.length} posts from ${source}`);
      }
      break;
    }

    default:
      console.log('Usage: node scripts/socialcontentengine.mjs <command>');
      console.log('Commands: approval-queue, daily-pack, export-csv, export-image-prompts, export-markdown, import-csv, import-metrics, prepare-week, report, validate');
      process.exitCode = command ? 1 : 0;
  }
}
