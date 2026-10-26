/**
 * Moves the current development build of the documentation to a directory
 * corresponding to the current package version
 *
 * Only tagged releases have a defined documentation version directory.  The
 * documentation for the current commit should be stored in the `dev`
 * directory, and not change path for each commit.
 *
 * Must be run from the project root directory.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const version = execSync(
  'git describe --tags --long --match=v* --always --dirty',
)
  .toString()
  .trim();

if (!version.endsWith('-dirty')) {
  fs.renameSync('dist/doc/dev', `dist/doc/${version}`);
}
