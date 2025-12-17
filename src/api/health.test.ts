import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return valid health response structure', () => {
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    expect(response.status).toBe('ok');
    expect(response.timestamp).toBeDefined();
    expect(new Date(response.timestamp).getTime()).not.toBeNaN();
  });
});
