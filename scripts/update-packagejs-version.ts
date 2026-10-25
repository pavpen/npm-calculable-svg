import { execSync } from 'node:child_process';

const version = execSync(
  'git describe --tags --long --match=v* --always --dirty',
)
  .toString()
  .trim();

execSync(`npm version ${version} --no-git-tag-version --allow-same-version`);
