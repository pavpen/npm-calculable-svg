import fs from 'node:fs/promises';
import path from 'node:path';
import { ProjectDirs } from './lib/project-dirs.ts';
import { runCommand } from './lib/run-command.ts';

class DocumentationBuilder {
  private readonly projectDirs = new ProjectDirs();
  private readonly gitCommand = 'git';
  private readonly npmCommand = 'npm';
  private readonly skipTagNames = ['v0.0.0-alpha.0'];

  get docOutputRootDir(): string {
    return this.projectDirs.docOutputRootDir;
  }

  async fetchVersionTagNames(): Promise<string[]> {
    const command = [this.gitCommand, 'tag', '--list', 'v*'];
    const { stdout } = await runCommand(command);

    return stdout
      .split('\n')
      .map((s) => s.trimEnd())
      .filter((t) => t.length > 0);
  }

  async checkoutTag(tagName: string): Promise<{ outputDir: string }> {
    const worktreesDir = this.projectDirs.docBuildSourceWorktreesDir;
    const outputDir = path.join(worktreesDir, tagName);

    await fs.mkdir(worktreesDir, { recursive: true });
    await runCommand(
      [this.gitCommand, 'worktree', 'add', tagName, '--orphan'],
      { cwd: worktreesDir },
    );
    await runCommand([this.gitCommand, 'checkout', tagName], {
      cwd: outputDir,
    });

    return { outputDir };
  }

  async cleanCheckoutTag(tagName: string): Promise<void> {
    const outputDir = path.join(
      this.projectDirs.docBuildSourceWorktreesDir,
      tagName,
    );

    await runCommand([this.gitCommand, 'worktree', 'remove', tagName], {
      cwd: outputDir,
    });
  }

  async buildDocForTagName(tagName: string): Promise<void> {
    const { outputDir: checkoutDir } = await this.checkoutTag(tagName);
    try {
      const typedocDir = path.join(checkoutDir, 'build-doc', 'typedoc');
      // See
      // <https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2>
      // for `{ shell: true }` requirement:
      const { stdout: npmInstallStdOut, stderr: npmInstallStdErr } =
        await runCommand([this.npmCommand, 'install'], {
          cwd: typedocDir,
          shell: true,
        });

      console.log(npmInstallStdOut);
      console.log(npmInstallStdErr);

      const { stdout: buildStdOut, stderr: buildStdErr } = await runCommand(
        [this.npmCommand, 'build-doc'],
        {
          cwd: typedocDir,
          shell: true,
        },
      );

      console.log(buildStdOut);
      console.log(buildStdErr);

      const worktreeDocDir = new ProjectDirs(checkoutDir).typedocOutputDir;
      await fs.rename(
        worktreeDocDir,
        path.join(this.docOutputRootDir, tagName),
      );
    } finally {
      this.cleanCheckoutTag(tagName);
    }

    console.log('Built documentation.', { gitTagName: tagName });
  }

  async calculateIsWorktreeDirty(): Promise<boolean> {
    const { stdout } = await runCommand([
      this.gitCommand,
      'describe',
      '--dirty',
    ]);

    return stdout.trimEnd().endsWith('-dirty');
  }

  async buildDocForWorktree(): Promise<void> {
    const { stdout, stderr } = await runCommand(
      [this.npmCommand, 'run', 'build-doc'],
      { shell: true },
    );

    console.log(stdout);
    console.log(stderr);
    console.log('Bulit documentation for the current worktree.');
  }

  async buildVersionSelectionPage({
    tagNames,
    includeDirtyWorkingTreeBuild,
  }: {
    tagNames: string[];
    includeDirtyWorkingTreeBuild: boolean;
  }): Promise<void> {
    const stagingDir = this.projectDirs.docVersionSelectionPageStagingDir;
    const outputDir = this.projectDirs.docVersionSelectionPageOutputDir;

    console.log(`Deleting directory tree: ${JSON.stringify(stagingDir)}`);
    await fs.rm(stagingDir, { recursive: true, force: true });

    await fs.cp(this.projectDirs.docVersionSelectionPageSourceDir, stagingDir, {
      recursive: true,
    });

    const versions = [
      ...(includeDirtyWorkingTreeBuild ? ['dev'] : []),
      ...tagNames,
    ];
    await fs.writeFile(
      this.projectDirs.docVersionSelectionPageStagingEntryPointFile,
      `\
/**
 * # Calculable SVG SDK Versions
 *
 * Documentation is available for the following versions:
 *
${versions.map((v) => ` * * [${v}](${v}/index.html)\n`)}\
 *
 * @packageDocumentation
 */
`,
    );

    const { stdout, stderr } = await runCommand(
      [
        this.npmCommand,
        'exec',
        '--',
        'typedoc',
        '--options',
        path.join(stagingDir, 'typedoc.jsonc'),
      ],
      { shell: true },
    );

    console.log(stdout);
    console.log(stderr);

    console.log('Built version selection page.', { outputDir });

    await fs.cp(outputDir, this.projectDirs.docOutputRootDir, {
      recursive: true,
    });
  }

  async buildDocForAllVersions(): Promise<void> {
    const tagNames = await this.fetchVersionTagNames();
    const versionTagNames = tagNames.filter(
      (t) => !this.skipTagNames.includes(t),
    );

    for (const tagName of versionTagNames) {
      await this.buildDocForTagName(tagName);
    }
    const isWorkingTreeDirty = await this.calculateIsWorktreeDirty();

    if (isWorkingTreeDirty) {
      await this.buildDocForWorktree();
    }

    await this.buildVersionSelectionPage({
      tagNames: versionTagNames,
      includeDirtyWorkingTreeBuild: isWorkingTreeDirty,
    });
  }
}

async function main(): Promise<void> {
  const builder = new DocumentationBuilder();

  await builder.buildDocForAllVersions();
}

await main();
