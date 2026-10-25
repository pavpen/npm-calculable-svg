import fs from 'node:fs/promises';
import url from 'node:url';
import { type ParseArgsOptionsConfig, parseArgs } from 'node:util';
import {
  type Browser,
  type BrowserContext,
  type ConsoleMessage,
  chromium,
  firefox,
} from 'playwright';

class CliArgs {
  static readonly cliOptions: ParseArgsOptionsConfig = {
    help: {
      type: 'boolean',
      short: 'h',
    },
    'inject-script-path': {
      type: 'string',
      default: undefined,
    },
    'input-path': {
      type: 'string',
      short: 'i',
      multiple: true,
    },
    'output-path': {
      type: 'string',
      short: 'o',
      multiple: true,
    },
    browser: {
      type: 'string',
      short: 'b',
    },
  };

  readonly inputPaths: Array<string>;
  readonly outputPaths: Array<string>;
  readonly injectScriptPath: string | null;
  readonly browser: 'chromium' | 'firefox';
  readonly printHelp: boolean;

  constructor({
    inputPaths,
    outputPaths,
    injectScriptPath,
    browser,
    printHelp,
  }: {
    inputPaths: Array<string>;
    outputPaths: Array<string>;
    injectScriptPath: string | null;
    browser: 'chromium' | 'firefox';
    printHelp: boolean;
  }) {
    this.inputPaths = inputPaths;
    this.outputPaths = outputPaths;
    this.injectScriptPath = injectScriptPath;
    this.browser = browser;
    this.printHelp = printHelp;
  }

  static fromArgv(): CliArgs {
    const { values } = parseArgs({
      options: CliArgs.cliOptions,
      allowPositionals: false,
    });

    const injectScriptPath = values['inject-script-path'] ?? null;

    if (typeof injectScriptPath !== 'string' && injectScriptPath !== null) {
      throw new Error(
        `Invalid parsed value for \`--inject-script-path\`: ${JSON.stringify(injectScriptPath)}`,
      );
    }

    const inputPaths = values['input-path'];
    const outputPaths = values['output-path'];

    if (!Array.isArray(inputPaths)) {
      throw new Error(
        `Invalid parsed value for \`--input-path\`s: not an array: ${JSON.stringify(inputPaths)}`,
      );
    }
    if (!Array.isArray(outputPaths)) {
      throw new Error(
        `Invalid parsed value for \`--output-path\`s: not an array: ${JSON.stringify(outputPaths)}`,
      );
    }
    if (inputPaths.length !== outputPaths.length) {
      throw new Error(`Input, and output path arguments must have the same length!
\`--input-path\` (${inputPaths.length}): ${JSON.stringify(inputPaths)}
\`--output-path\` (${outputPaths.length}): ${JSON.stringify(outputPaths)}
`);
    }

    const browser = values.browser ?? 'firefox';
    if (
      typeof browser !== 'string' ||
      (browser !== 'firefox' && browser !== 'chromium')
    ) {
      throw new Error(`Invalid parsed \`--browser\` argument!  Must be in ['firefox', 'chromium']: \
${JSON.stringify(browser)}`);
    }

    return new CliArgs({
      inputPaths: inputPaths as Array<string>,
      outputPaths: outputPaths as Array<string>,
      injectScriptPath,
      browser,
      printHelp: !!values.help,
    });
  }
}

class CsvgFileProcessor {
  private readonly browser: Browser | undefined;
  private readonly browserContext: BrowserContext;
  private readonly autoCloseBrowserContext: boolean;
  private readonly injectScriptPath: string | null;
  private injectScriptContent: string | undefined;

  constructor({
    browser,
    browserContext,
    autoCloseBrowserContext,
    injectScriptPath,
  }: {
    browser?: Browser | undefined;
    browserContext: BrowserContext;
    autoCloseBrowserContext: boolean;
    injectScriptPath: string | null;
  }) {
    this.browser = browser;
    this.browserContext = browserContext;
    this.autoCloseBrowserContext = autoCloseBrowserContext;
    this.injectScriptPath = injectScriptPath;
  }

  static async create({
    browserContext,
    browser,
    injectScriptPath,
  }: {
    browserContext?: BrowserContext | undefined;
    browser?: Browser | undefined;
    injectScriptPath: string | null;
  }) {
    if (typeof browserContext !== 'undefined') {
      return new CsvgFileProcessor({
        browserContext,
        autoCloseBrowserContext: false,
        injectScriptPath,
      });
    }

    const resolvedBrowser =
      typeof browser === 'undefined'
        ? await firefox.launch({ headless: false })
        : browser;

    return new CsvgFileProcessor({
      browser: typeof browser === 'undefined' ? resolvedBrowser : undefined,
      browserContext: await resolvedBrowser.newContext(),
      autoCloseBrowserContext: true,
      injectScriptPath,
    });
  }

  close(): void {
    if (this.autoCloseBrowserContext) {
      this.browserContext.close();
    }

    const browser = this.browser;
    if (typeof browser !== 'undefined') {
      browser.close();
    }
  }

  async fetchInjectScriptContent(): Promise<string> {
    let result = this.injectScriptContent;

    if (typeof result === 'undefined') {
      const path = this.injectScriptPath;

      if (path) {
        result = (await fs.readFile(path)).toString();
      } else {
        result = '';
      }

      this.injectScriptContent = result;
    }

    return result;
  }

  async processCsvgFile(inputPath: string, outputPath: string): Promise<void> {
    const page = await this.browserContext.newPage();

    page.on('console', (consoleMessage: ConsoleMessage) => {
      console.log(consoleMessage.toString());
    });

    const fileUrl = url.pathToFileURL(inputPath).toString();

    await page.goto(fileUrl);
    await page.waitForLoadState('load');

    const injectScriptContent = await this.fetchInjectScriptContent();
    if (injectScriptContent) {
      await page.evaluate(injectScriptContent);
    }

    const documentSource = await page.evaluate(() => {
      return document.children[0].outerHTML;
    });

    await fs.writeFile(outputPath, documentSource);

    console.log('Rendered CSVG File.', { inputPath, fileUrl, outputPath });
  }
}

const main = async (): Promise<void> => {
  const args = CliArgs.fromArgv();

  if (args.printHelp) {
    console.log({
      commandName: 'csvg-prerender',
      description:
        'Evaluates Calculable SVG expressions, and substitutes them in each input file',
      options: CliArgs.cliOptions,
      positionals: '[CSVG_PATH, ...]',
    });
    return;
  }

  const browser =
    args.browser === 'chromium'
      ? await chromium.launch({ headless: true })
      : await firefox.launch({ headless: true });

  try {
    const fileProcessor = await CsvgFileProcessor.create({
      browser,
      injectScriptPath: args.injectScriptPath,
    });

    try {
      const { inputPaths, outputPaths } = args;
      const fileCount = Math.min(inputPaths.length, outputPaths.length);

      for (let i = 0; i < fileCount; ++i) {
        await fileProcessor.processCsvgFile(inputPaths[i], outputPaths[i]);
      }
    } finally {
      await fileProcessor.close();
    }
  } finally {
    browser.close();
  }
};

await main();
