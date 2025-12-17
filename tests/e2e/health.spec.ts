import { test, expect } from '@playwright/test';

interface HealthResponse {
  status: string;
  timestamp: string;
}

test.describe('Health Check', () => {
  test('API health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json() as HealthResponse;
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  test('Frontend loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Claude Base');
  });
});
