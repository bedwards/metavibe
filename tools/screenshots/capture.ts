/**
 * Screenshot Capture Tool
 *
 * Captures screenshots of web pages for visual verification.
 * Used by Claude instances to verify UI changes and guide UX decisions.
 *
 * From Anthropic Engineering Blog - "Building agents with the Claude Agent SDK":
 * "Visual feedback - Screenshots/renders for UI tasks, checking layout, styling, responsiveness"
 *
 * Usage:
 *   npm run screenshot -- --url http://localhost:3000 --name homepage
 *   npm run screenshot -- --url http://localhost:3000/login --name login --viewport 375x667
 */

import { chromium, type Browser, type Page } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config();

interface ScreenshotOptions {
  url: string;
  name: string;
  viewport?: { width: number; height: number };
  fullPage?: boolean;
  selector?: string;
  waitFor?: string;
  delay?: number;
}

const SCREENSHOTS_DIR = join(process.cwd(), 'screenshots');
const BASELINE_DIR = join(SCREENSHOTS_DIR, 'baseline');
const CURRENT_DIR = join(SCREENSHOTS_DIR, 'current');

function ensureDirectories() {
  for (const dir of [SCREENSHOTS_DIR, BASELINE_DIR, CURRENT_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

async function captureScreenshot(options: ScreenshotOptions): Promise<string> {
  const {
    url,
    name,
    viewport = { width: 1280, height: 720 },
    fullPage = false,
    selector,
    waitFor,
    delay = 0,
  } = options;

  ensureDirectories();

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await chromium.launch();
    page = await browser.newPage();

    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: 'networkidle' });

    if (waitFor) {
      await page.waitForSelector(waitFor);
    }

    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = join(CURRENT_DIR, filename);

    if (selector) {
      const element = page.locator(selector);
      await element.screenshot({ path: filepath });
    } else {
      await page.screenshot({ path: filepath, fullPage });
    }

    console.info(`Screenshot saved: ${filepath}`);
    return filepath;
  } finally {
    if (page) {await page.close();}
    if (browser) {await browser.close();}
  }
}

function parseArgs(): ScreenshotOptions {
  const args = process.argv.slice(2);
  const options: Partial<ScreenshotOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    switch (key) {
      case 'url':
        options.url = value;
        break;
      case 'name':
        options.name = value;
        break;
      case 'viewport': {
        const [w, h] = value.split('x').map(Number);
        options.viewport = { width: w, height: h };
        break;
      }
      case 'fullPage':
        options.fullPage = value === 'true';
        break;
      case 'selector':
        options.selector = value;
        break;
      case 'waitFor':
        options.waitFor = value;
        break;
      case 'delay':
        options.delay = parseInt(value, 10);
        break;
    }
  }

  if (!options.url || !options.name) {
    console.error('Usage: npm run screenshot -- --url <url> --name <name> [options]');
    console.error('Options:');
    console.error('  --viewport <width>x<height>  Viewport size (default: 1280x720)');
    console.error('  --fullPage <true|false>      Capture full page (default: false)');
    console.error('  --selector <css>             Capture specific element');
    console.error('  --waitFor <css>              Wait for selector before capture');
    console.error('  --delay <ms>                 Wait after page load');
    process.exit(1);
  }

  return options as ScreenshotOptions;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  captureScreenshot(options).catch((err: unknown) => {
    console.error('Screenshot capture failed:', err);
    process.exit(1);
  });
}

export { captureScreenshot, SCREENSHOTS_DIR, BASELINE_DIR, CURRENT_DIR };
export type { ScreenshotOptions };
