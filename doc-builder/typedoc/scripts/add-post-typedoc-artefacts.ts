/**
 * Post-processes the output of TypeDoc to add custom scripts, etc.
 */

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CsvgTransformer } from './lib/csvg-transformer.ts';
import { DocumentationCsvgArtefacts } from './lib/documentation-artefacts.ts';
import { ProjectPaths } from './lib/project-paths.ts';

class ArtefactsBuilder {
  private readonly projectDirs = new ProjectPaths();
  private readonly documentationCsvgArtefacts =
    new DocumentationCsvgArtefacts();
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
    for (const csvgInfo of await this.documentationCsvgArtefacts.getCsvgExampleArtefactsInformation()) {
      const outputPath = path.join(
        this.projectDirs.typedocOutputMediaDir,
        csvgInfo.fileName,
      );
      if (fsSync.existsSync(outputPath)) {
        continue;
      }

      const inputPath = path.join(
        this.projectDirs.examplesSourceDir,
        csvgInfo.fileName,
      );

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
