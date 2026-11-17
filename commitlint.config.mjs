/**
 * Commit messages follow Conventional Commits: `type(scope): summary`, e.g.
 *   feat(partner-sales): record a sale from a bill amount
 *   fix: show only the partner code after a scan
 * Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
 */
const config = { extends: ["@commitlint/config-conventional"] };

export default config;
