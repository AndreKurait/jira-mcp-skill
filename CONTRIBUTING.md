# Contributing

The CLI lives in `packages/jira-mcp-skill`. Use Node.js 22 or later and npm:

```sh
cd packages/jira-mcp-skill
npm ci --ignore-scripts
npm test
```

`npm test` compiles TypeScript, copies the hook and package documentation, and runs Node's built-in test runner. The suite uses temporary configuration roots and synthetic credentials. It validates malformed-file handling, preservation of unrelated settings, file permissions, guide and hook installation, version consistency, and an offline install of the actual npm archive. It does not launch MCP clients, contact Jira, or check real credentials. CI runs the suite on Linux, macOS, and Windows; Unix permission and symlink cases are skipped on Windows.

Never test installation against your real home or checked-in credentials. For manual testing, use synthetic values and an explicit scratch root:

```sh
node build/cli.js \
  --config-root ./scratch-home \
  --url https://example.atlassian.net \
  --email you@example.com \
  --token-file ./scratch-token \
  --agent cursor
```

Create a fake token file for this example and remove both scratch paths afterward. Do not start an agent with this configuration. The production CLI defaults to the real home directory when `--config-root` is omitted; tests must always provide it.

Edit the root `README.md` and `LICENSE`; the build copies them into the npm package. Keep project-specific information out of `skill/SKILL.md`. Add regression coverage for changes to config merging, filesystem handling, credential input, or package layout. Prefer targeted tests for externally observable behavior over snapshots of implementation details.

Before a release, run `npm test` from a clean checkout, update the manifest and lockfile versions together, and inspect `npm pack --dry-run`. Versions used by the CLI and packaged hook come from `package.json`; installed hooks read the adjacent `.version` marker. Packaging rebuilds before creating an archive. Publishing remains a maintainer action; CI does not publish or require package-registry credentials.

Report bugs with the OS, Node version, package version, selected client, and a minimal redacted reproduction. Do not include Jira tokens, customer data, or a complete client config.
