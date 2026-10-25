/**
 * Post-processes the output of TypeDoc to add custom scripts, etc.
 */

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CsvgTransformer } from './lib/csvg-transformer.ts';
import { IncludedArtefacts } from './lib/included-artefacts.ts';
import { ProjectDirs } from './lib/project-dirs.ts';

class ArtefactsBuilder {
  private readonly projectDirs = new ProjectDirs();
  private readonly includedArtefacts = new IncludedArtefacts();
  private csvgTransformer = new CsvgTransformer();

  async copyEvaluateForCurrentDocumentDebugScript(): Promise<void> {
    const inputFileName = 'evaluate-for-current-document-debug.js';
    const inputPath = path.join(this.projectDirs.distDir, inputFileName);
    const outputPath = path.join(
      this.projectDirs.typedocOutputMediaDir,
      inputFileName,
    );

    console.log('Copying.', { inputPath, outputPath });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.copyFile(inputPath, outputPath);
  }

  async copyIncludedExampleCsvgFiles(): Promise<void> {
    for (const fileName of this.includedArtefacts.getIncludedCsvgExampleFileNames()) {
      const outputPath = path.join(
        this.projectDirs.typedocOutputMediaDir,
        fileName,
      );
      if (fsSync.existsSync(outputPath)) {
        continue;
      }

      const inputPath = path.join(this.projectDirs.examplesSourceDir, fileName);

      console.log('Copying.', { inputPath, outputPath });

      await fs.copyFile(inputPath, outputPath);
    }
  }

  async transformCsvgFiles(): Promise<void> {
    for (const entry of await fs.readdir(
      this.projectDirs.typedocOutputMediaDir,
      { withFileTypes: true },
    )) {
      if (entry.isFile() && entry.name.endsWith('.svg')) {
        await this.csvgTransformer.transformFile(
          path.join(entry.parentPath, entry.name),
        );
      }
    }
  }

  async buildMediaArtefacts(): Promise<void> {
    await this.copyEvaluateForCurrentDocumentDebugScript();
    await this.copyIncludedExampleCsvgFiles();
    await this.transformCsvgFiles();
  }
}

async function main() {
  const builder = new ArtefactsBuilder();

  await builder.buildMediaArtefacts();
}

await main();
