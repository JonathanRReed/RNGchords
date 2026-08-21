import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const homepageSource = readFileSync(join(import.meta.dirname, '..', 'src', 'pages', 'index.astro'), 'utf8');

describe('homepage structured data', () => {
	test('describes the project without claiming an unrated app rich result', () => {
		expect(homepageSource).toContain('"@type": "CreativeWork"');
		expect(homepageSource).not.toContain('"@type": "SoftwareApplication"');
		expect(homepageSource).not.toContain('"@type": "WebApplication"');
	});
});
