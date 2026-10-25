/**
 * Pre-processes files, so they produce correct output when consumed by
 * TypeDoc (even, if they may violate linter, or syntax rules)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { CsvgTransformer } from './lib/csvg-transformer.ts';
import {
  type CsvgArtefactInformation,
  DocumentationCsvgArtefacts,
} from './lib/documentation-artefacts.ts';
import { GitHubToTypeDocMarkdownTransformer } from './lib/github-to-typedoc-markdown-transformer.ts';
import { ProjectPaths } from './lib/project-paths.ts';
import { escapeXmlAttributeValue } from './lib/xml-helpers.ts';

class ArtefactsBuilder {
  private readonly projectPaths = new ProjectPaths();
  private readonly csvgArtefacts = new DocumentationCsvgArtefacts();
  private readonly csvgTransformer = new CsvgTransformer();
  private readonly gitHubToTypeDocMarkdownTransformer =
    new GitHubToTypeDocMarkdownTransformer();
  private cachedCsvgExampleArtefactsInformation:
    | CsvgArtefactInformation[]
    | undefined;

  private async calculateCsvgExampleArtefactsInformation(): Promise<
    CsvgArtefactInformation[]
  > {
    let result = this.cachedCsvgExampleArtefactsInformation;

    if (typeof result === 'undefined') {
      result = await this.csvgArtefacts.getCsvgExampleArtefactsInformation();
      this.cachedCsvgExampleArtefactsInformation = result;
    }

    return result;
  }

  async stageExamplesCsvgs(): Promise<void> {
    for (const artefactInfo of await this.calculateCsvgExampleArtefactsInformation()) {
      const inputFileName = artefactInfo.fileName;
      const inputPath = path.join(
        this.projectPaths.examplesSourceDir,
        inputFileName,
      );
      const outputPath = path.join(
        this.projectPaths.stagingExamplesDir,
        `${inputFileName}.md`,
      );

      console.log('Building.', { inputPath, outputPath });

      const fileContents = (await fs.readFile(inputPath)).toString();
      const outputContents = this.csvgTransformer.transformString(fileContents);
      const titleTextMatch = fileContents.match(/<title>([^<>]*)<\/title>/);
      const titleAttribute = titleTextMatch
        ? ` title="${escapeXmlAttributeValue(titleTextMatch[1])}"`
        : '';
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(
        outputPath,
        `\
\`\`\`
${outputContents}
\`\`\`

${
  artefactInfo.hasVisibleContent
    ? 'Output:\n'
    : 'Output (Inspect Elements in Developer Tools to see results.):\n'
}\

<object data="../media/${escapeXmlAttributeValue(inputFileName)}" type="image/svg+xml"${titleAttribute}>
    <p>Object rendering refused by the browser.</p>
</object>
`,
      );
    }
  }

  async stageExamplesMd(): Promise<void> {
    const outputPath = path.join(
      this.projectPaths.stagingExamplesDir,
      'examples.md',
    );
    const csvgExampleArtefactsInformation =
      await this.calculateCsvgExampleArtefactsInformation();
    const renderCsvgExample = (csvgInfo: CsvgArtefactInformation): string => `\
## Example: \`${csvgInfo.fileName}\`

${csvgInfo.title}

{@include ${csvgInfo.fileName}.md}
`;

    await fs.writeFile(
      outputPath,
      `\
---
title: Calculable SVG Examples
---
# Calculable SVG Examples

${csvgExampleArtefactsInformation.map(renderCsvgExample).join('\n')}
`,
    );
  }

  async stageReadmeMd(): Promise<void> {
    const fileName = 'README.md';
    const inputPath = path.join(this.projectPaths.projectRootDir, fileName);
    const outputPath = path.join(
      this.projectPaths.stagingMarkdownDir,
      fileName,
    );

    await this.gitHubToTypeDocMarkdownTransformer.transformFile(
      inputPath,
      outputPath,
    );
  }
}

async function main() {
  const builder = new ArtefactsBuilder();

  await builder.stageExamplesCsvgs();
  await builder.stageExamplesMd();
  await builder.stageReadmeMd();
}

await main();
