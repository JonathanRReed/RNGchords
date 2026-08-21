import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const headers = readFileSync(join(import.meta.dirname, '..', 'public', '_headers'), 'utf8');

describe('security headers', () => {
	test('allow audio workers and the Cloudflare analytics beacon', () => {
		expect(headers).toContain("worker-src 'self' blob:");
		expect(headers).toContain('https://static.cloudflareinsights.com');
		expect(headers).toContain("connect-src 'self'");
	});
});
