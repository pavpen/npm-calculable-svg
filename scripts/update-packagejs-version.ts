/**
 * Updates the version field in `package.json` for this repository, so it
 * includes pre-release commit + hash version strings
 *
 * We use this, so that we can publish documentation for the current
 * development commit.  This goes against common practices, but may have some
 * usefulness for understanding the current state of the repository, and for
 * new contributions.
 *
 * Must be run from the project root directory (the one containing
 * `package.json`).
 */

import { execSync } from 'node:child_process';

const version = execSync(
  'git describe --tags --long --match=v* --always --dirty',
)
  .toString()
  .trim();

execSync(`npm version ${version} --no-git-tag-version --allow-same-version`);
