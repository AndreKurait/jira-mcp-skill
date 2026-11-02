# Changelog

## Unreleased

- Fix project-guide and hook installation in the ESM CLI and derive every version entry point from the package manifest or installed version marker.
- Validate affected configurations before writing; preserve unrelated client settings and refuse malformed JSON and unsafe file targets.
- Replace managed files atomically with private Unix permissions. Document plaintext credentials and the limits of Windows permissions and multi-file installation.
- Add explicit client selection, isolated configuration roots, environment/token-file input, and hidden interactive token entry. Non-interactive setup now requires `--agent` and complete credentials.
- Register guides only for selected Kiro clients, preserve unrelated startup hooks, and make release checks and new startup hooks opt-in.
- Remove tenant/project defaults and replace the project guide with a neutral template. Infer Confluence only for root Atlassian Cloud URLs.
- Include the license in npm archives and add cross-platform CI with isolated installer and packed-package regression tests.
