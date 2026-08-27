import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync('dist/bin', { recursive: true });
const suffix = process.platform === 'win32' ? '.exe' : '';
copyFileSync(join('target', 'release', `otel-token-meter${suffix}`), join('dist', 'bin', `otel-token-meter${suffix}`));
