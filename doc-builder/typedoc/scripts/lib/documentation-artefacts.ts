import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { ProjectPaths } from './project-paths.ts';

export class CsvgArtefactInformation {
  readonly fileName: string;
  readonly title: string;
  readonly hasVisibleContent: boolean;

  constructor({
    fileName,
    title,
    hasVisibleContent,
  }: { fileName: string; title: string; hasVisibleContent?: boolean }) {
    this.fileName = fileName;
    this.title = title;
    this.hasVisibleContent = hasVisibleContent ?? true;
  }
}

const svgVisibleElementNames: Set<string> = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'textPath',
]);

const xmlNodeTreeHasVisibleContent = (
  xmlNode: object | object[] | string,
): boolean => {
  if (typeof xmlNode !== 'object') {
    return false;
  }
  if (Array.isArray(xmlNode)) {
    for (const value of xmlNode) {
      if (xmlNodeTreeHasVisibleContent(value)) {
        return true;
      }
    }
    return false;
  }

  for (const [key, value] of Object.entries(xmlNode)) {
    if (svgVisibleElementNames.has(key)) {
      return true;
    }
    if (xmlNodeTreeHasVisibleContent(value)) {
      return true;
    }
  }

  return false;
};

const extractTitle = (
  xmlNode: object | object[] | string,
): string | undefined => {
  if (typeof xmlNode !== 'object') {
    return undefined;
  }
  if (Array.isArray(xmlNode)) {
    for (const value of xmlNode) {
      const result = extractTitle(value);
      if (typeof result !== 'undefined') {
        return result;
      }
    }
    return undefined;
  }

  for (const [key, value] of Object.entries(xmlNode)) {
    if (key === 'title') {
      if (typeof value !== 'string') {
        throw new Error(
          `Expected a TextNode's text to be associated with a <title/> Node!  \
Got: ${JSON.stringify(value)}`,
        );
      }

      return value;
    }
    const subtreeResult = extractTitle(value);

    if (typeof subtreeResult !== 'undefined') {
      return subtreeResult;
    }
  }

  return undefined;
};

export class DocumentationCsvgArtefacts {
  private readonly projectPaths = new ProjectPaths();

  async getCsvgExampleArtefactsInformation(): Promise<
    CsvgArtefactInformation[]
  > {
    const result: Array<CsvgArtefactInformation> = [];

    for (const entry of await fs.readdir(this.projectPaths.examplesSourceDir, {
      withFileTypes: true,
    })) {
      if (!entry.isFile() || !entry.name.endsWith('.svg')) {
        continue;
      }
      const filePath = path.join(entry.parentPath, entry.name);
      const sourceXmlString = (await fs.readFile(filePath)).toString();
      const parser = new XMLParser({
        ignoreAttributes: true,
        preserveOrder: false,
      });
      const xmlRootNode = parser.parse(sourceXmlString);
      const title = extractTitle(xmlRootNode);
      if (typeof title !== 'string') {
        throw new Error(
          `Failed to extract <title/> from ${JSON.stringify(filePath)}`,
        );
      }
      const hasVisibleContent = xmlNodeTreeHasVisibleContent(xmlRootNode);
      result.push(
        new CsvgArtefactInformation({
          fileName: entry.name,
          title,
          hasVisibleContent,
        }),
      );
    }

    return result;
  }
}
