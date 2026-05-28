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
  approvalQueue,
  generateDailyContentPack,
  generateMarkdownReview,
  generateThemeReport,
  imagePromptRows,
  loadContent,
  mergeMetrics,
  readTemplate,
  saveContent,
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
      const out = option(args, 'out', outputPath('daily_content_pack.md'));
      const weekStart = option(args, 'week-start', '2026-06-01');
      const template = await readTemplate(templatePath);
      const posts = await loadContent(source);
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
      const out = option(args, 'out', outputPath('image_prompts.csv'));
      const posts = await loadContent(source);
      await writeCsvObjects(out, imagePromptRows(posts), IMAGE_PROMPT_HEADERS);
      console.log(`Exported ${posts.length} image prompts to ${out}`);
      break;
    }

    case 'export-markdown': {
      const out = option(args, 'out', outputPath('content_review.md'));
      const posts = await loadContent(source);
      await writeText(out, generateMarkdownReview(posts));
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
      console.log('Commands: approval-queue, daily-pack, export-csv, export-image-prompts, export-markdown, import-csv, import-metrics, report, validate');
      process.exitCode = command ? 1 : 0;
  }
}
