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
