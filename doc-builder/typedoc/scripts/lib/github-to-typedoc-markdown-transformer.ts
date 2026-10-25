import fs from 'node:fs/promises';
import path from 'node:path';
import { ProjectPaths } from './project-paths.ts';
import { escapeXmlAttributeValue } from './xml-helpers.ts';

const markdownRegExpLink =
  /(?<isImage>!?)\[(?<label>[^[\]]*)\]\((?<url>[^())]*)\)/g;
const markdownRegExpCodeBlock =
  /(\r\n|\r|\n)(?<indent>[\s--[\r\n]]*)```(?<languageId>[a-zA-Z_\-]*)(\r\n|\r|\n)(?<contents>.*)(\r\n|\r|\n)[\s--[\r\n]]*```(\r\n|\r|\n)/gsv;

export class GitHubToTypeDocMarkdownTransformer {
  private readonly projectPaths = new ProjectPaths();
  /**
   * * Updates URLs referring to the GitHub Pages dev documentation to refer
   *   local dev documentation build directory.
   * * Updates "```svg . . .```" blocks to just "``` . . . ```" blocks.
   *   TypeDoc doesn't have a syntax highlighter for SVG, and puts the SVG
   *   inside a `<pre/>` element without escaping it, which doesn't render the
   *   SVG source code in the output documentation.
   */
  transformString({
    inputFilePath,
    outputFilePath,
    csvgSource,
  }: {
    inputFilePath: string;
    outputFilePath: string;
    csvgSource: string;
  }): string {
    const relativePathToDocRootComponents = path
      .relative(
        path.dirname(outputFilePath),
        this.projectPaths.typedocOutputDir,
      )
      .split(path.sep);
    const relativePathToInputDirComponents = path
      .relative(path.dirname(outputFilePath), path.dirname(inputFilePath))
      .split(path.sep);
    const inputDirRelativeToProjectRootComponents = path
      .relative(path.dirname(inputFilePath), this.projectPaths.projectRootDir)
      .split(path.sep);
    const docSiteRootUrl = new URL(
      'https://pavpen.github.io/npm-calculable-svg/dev/',
    );

    const transformMarkdownLink = (
      _matchedString: string,
      isImage: string,
      label: string,
      inputUrlString: string,
      _matchOffset: number,
      _inputString: number,
      _matchGroups: Record<string, string>,
    ): string => {
      let outputUrlString: string;
      if (inputUrlString.includes(':')) {
        const url = new URL(inputUrlString);

        if (
          url.host === docSiteRootUrl.host &&
          url.pathname.startsWith(docSiteRootUrl.pathname)
        ) {
          const docRelativePath = url.pathname.substring(
            docSiteRootUrl.pathname.length,
          );
          const modulesPrefix = 'modules/';
          const suffix = '.html';
          if (
            docRelativePath.startsWith(modulesPrefix) &&
            docRelativePath.endsWith(suffix)
          ) {
            const modulePath = docRelativePath.substring(
              modulesPrefix.length,
              docRelativePath.length - suffix.length,
            );

            return `{@link ${modulePath}}`;
          }
          outputUrlString = path.posix.join(
            ...relativePathToDocRootComponents,
            docRelativePath,
          );
        } else {
          outputUrlString = inputUrlString;
        }
      } else {
        if (path.isAbsolute(inputUrlString)) {
          outputUrlString = inputUrlString;
        } else {
          outputUrlString = isImage
            ? path.posix.join(
                ...inputDirRelativeToProjectRootComponents,
                'media',
                path.basename(inputUrlString),
              )
            : path.posix.join(
                ...relativePathToInputDirComponents,
                inputUrlString,
              );
        }
      }

      return isImage
        ? `<object data="${escapeXmlAttributeValue(outputUrlString)}" type="image/svg+xml" title="${escapeXmlAttributeValue(label)}">
  <p>Object rendering refused by the browser.</p>
</object>`
        : `[${label}](${outputUrlString})`;
    };

    return csvgSource
      .replaceAll(markdownRegExpLink, transformMarkdownLink)
      .replaceAll(
        markdownRegExpCodeBlock,
        '\n$<indent>```\n$<contents>\n$<indent>```\n',
      );
  }

  async transformFile(inputPath: string, outputPath: string): Promise<void> {
    const inputContent = (await fs.readFile(inputPath)).toString();
    const outputContent = this.transformString({
      inputFilePath: inputPath,
      outputFilePath: outputPath,
      csvgSource: inputContent,
    });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, outputContent);

    console.log('Transformed GitHub Markdown → TypeDoc Markdown.', {
      inputPath,
      outputPath,
    });
  }
}
