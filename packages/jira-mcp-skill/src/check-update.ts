#!/usr/bin/env node
// Compatibility entry point: share the same version source and checker as the hook.
import { createRequire } from 'node:module';
const { run } = createRequire(import.meta.url)('./version-hook.cjs');
await run();
