/**
 * Screenshot Comparison Tool
 *
 * Compares current screenshots against baselines to detect visual regressions.
 * Returns difference metrics and generates diff images for review.
 *
 * From Anthropic Engineering Blog - "Building agents with the Claude Agent SDK":
 * "Visual feedback - Screenshots/renders for UI tasks, checking layout, styling, responsiveness"
 *
 * Usage:
 *   npm run screenshot:compare -- --name homepage
 *   npm run screenshot:compare -- --name homepage --threshold 0.1
 */

import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BASELINE_DIR, CURRENT_DIR, SCREENSHOTS_DIR } from './capture.js';

interface ComparisonResult {
  name: string;
  baselineFile: string;
  currentFile: string;
  diffFile: string;
  mismatchedPixels: number;
  totalPixels: number;
  mismatchPercentage: number;
  passed: boolean;
}

const DIFF_DIR = join(SCREENSHOTS_DIR, 'diff');

function ensureDiffDir() {
  if (!existsSync(DIFF_DIR)) {
    mkdirSync(DIFF_DIR, { recursive: true });
  }
}

function findLatestScreenshot(dir: string, prefix: string): string | null {
  if (!existsSync(dir)) {return null;}

  const files = readdirSync(dir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
    .sort()
    .reverse();

  return files[0] ? join(dir, files[0]) : null;
}

function compareScreenshots(
  name: string,
  threshold: number = 0.05
): ComparisonResult {
  ensureDiffDir();

  const baselineFile = findLatestScreenshot(BASELINE_DIR, name);
  const currentFile = findLatestScreenshot(CURRENT_DIR, name);

  if (!baselineFile) {
    throw new Error(`No baseline found for "${name}". Run screenshot capture and save as baseline first.`);
  }

  if (!currentFile) {
    throw new Error(`No current screenshot found for "${name}". Run screenshot capture first.`);
  }

  const baseline = PNG.sync.read(readFileSync(baselineFile));
  const current = PNG.sync.read(readFileSync(currentFile));

  if (baseline.width !== current.width || baseline.height !== current.height) {
    throw new Error(
      `Dimension mismatch: baseline (${baseline.width}x${baseline.height}) vs current (${current.width}x${current.height})`
    );
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const mismatchedPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  const totalPixels = width * height;
  const mismatchPercentage = mismatchedPixels / totalPixels;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const diffFile = join(DIFF_DIR, `${name}-diff-${timestamp}.png`);
  writeFileSync(diffFile, PNG.sync.write(diff));

  const result: ComparisonResult = {
    name,
    baselineFile,
    currentFile,
    diffFile,
    mismatchedPixels,
    totalPixels,
    mismatchPercentage,
    passed: mismatchPercentage <= threshold,
  };

  return result;
}

function formatResult(result: ComparisonResult): string {
  const status = result.passed ? 'PASS' : 'FAIL';
  const percentage = (result.mismatchPercentage * 100).toFixed(2);

  return `
[${status}] ${result.name}
  Mismatched: ${result.mismatchedPixels}/${result.totalPixels} pixels (${percentage}%)
  Baseline: ${result.baselineFile}
  Current: ${result.currentFile}
  Diff: ${result.diffFile}
`;
}

function parseArgs(): { name: string; threshold: number } {
  const args = process.argv.slice(2);
  let name = '';
  let threshold = 0.05;

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    switch (key) {
      case 'name':
        name = value;
        break;
      case 'threshold':
        threshold = parseFloat(value);
        break;
    }
  }

  if (!name) {
    console.error('Usage: npm run screenshot:compare -- --name <name> [--threshold <0-1>]');
    process.exit(1);
  }

  return { name, threshold };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { name, threshold } = parseArgs();
  try {
    const result = compareScreenshots(name, threshold);
    console.info(formatResult(result));
    process.exit(result.passed ? 0 : 1);
  } catch (err: unknown) {
    console.error('Comparison failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export { compareScreenshots };
export type { ComparisonResult };
