import fs from 'node:fs';

fs.copyFileSync(new URL('../src/version-hook.cjs', import.meta.url), new URL('../build/version-hook.cjs', import.meta.url));
fs.copyFileSync(new URL('../../../README.md', import.meta.url), new URL('../README.md', import.meta.url));
fs.copyFileSync(new URL('../../../LICENSE', import.meta.url), new URL('../LICENSE', import.meta.url));
fs.chmodSync(new URL('../build/cli.js', import.meta.url), 0o755);
