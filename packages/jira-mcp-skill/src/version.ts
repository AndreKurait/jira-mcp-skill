import fs from 'node:fs';

// Both source and compiled files live one directory below the package manifest.
export const VERSION: string = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;
