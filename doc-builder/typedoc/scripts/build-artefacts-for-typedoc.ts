/**
 * Pre-processes files, so they produce correct output when consumed by
 * TypeDoc (even, if they may violate linter, or syntax rules)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { CsvgTransformer } from './lib/csvg-transformer.ts';
import { IncludedArtefacts } from './lib/included-artefacts.ts';
import { ProjectDirs } from './lib/project-dirs.ts';

class ArtefactsBuilder {
  private readonly projectDirs = new ProjectDirs();
  private readonly includedArtefacts = new IncludedArtefacts();
  private readonly csvgTransformer = new CsvgTransformer();

  async buildXmlApiExamples(): Promise<void> {
    for (const inputFleName of this.includedArtefacts.getIncludedCsvgExampleFileNames()) {
      const inputPath = path.join(
        this.projectDirs.examplesSourceDir,
        inputFleName,
      );
      const outputPath = path.join(
        this.projectDirs.outputXmlApiExamplesDir,
        `${inputFleName}.md`,
      );

      console.log('Building.', { inputPath, outputPath });

      const fileContents = (await fs.readFile(inputPath)).toString();
      const outputContents = this.csvgTransformer.transformString(fileContents);
      const titleTextMatch = fileContents.match(/<title>([^<>]*)<\/title>/);
      const titleAttribute = titleTextMatch
        ? ` title="${encodeURIComponent(titleTextMatch[1])}"`
        : '';
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(
        outputPath,
        `\
\`\`\`
${outputContents}
\`\`\`

Output:

<object data="../media/${inputFleName}" type="image/svg+xml"${titleAttribute}>
    <p>Object rendering refused by the browser.</p>
</object>
`,
      );
    }
  }
}

async function main() {
  const builder = new ArtefactsBuilder();

  await builder.buildXmlApiExamples();
}

await main();
