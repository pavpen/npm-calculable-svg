import { expect } from '@rstest/playwright';
import type { Page } from 'playwright';

/**
 * The result of testing whether a Playwright browser page's document is
 * equivalent to a given document source code (`outerHTML`)
 */
export class PageDocumentEquivalenceToSource {
  /** Expected document's `outerHTML` */
  readonly expectedSource: string;

  /** Actual browser document's `outerHTML` */
  readonly actualSource: string;

  readonly areEquivalent: boolean;

  constructor({
    expectedSource,
    actualSource,
    areEquivalent,
  }: { expectedSource: string; actualSource: string; areEquivalent: boolean }) {
    this.expectedSource = expectedSource;
    this.actualSource = actualSource;
    this.areEquivalent = areEquivalent;
  }
}

/**
 * Tests whether a Playwright browser's current page document is equivalent to
 * a given document source code (`outerHTML`)
 *
 * You'd usually use this in an {@link expect} statement.
 *
 * Example (note the `await`):
 *
 * ```typescript
 * expect(
 *   await isPageDocumentEquivalentToSvgSource(page, expectedSvgSource),
 * ).toBeTrue();
 * ```
 *
 * Since `expect` assertions are evaluated synchronously, we can't execute
 * async operations, such as extracting, and comparing a {@link Page}
 * document.  Thus, the existance of this function, and its example use above.
 */
export const isPageDocumentEquivalentToSvgSource = async (
  page: Page,
  expectedSvgSource: string,
): Promise<PageDocumentEquivalenceToSource> =>
  new PageDocumentEquivalenceToSource({
    ...(await page.evaluate((expected) => {
      const parsed = new DOMParser().parseFromString(expected, 'image/svg+xml');
      return {
        areEquivalent: document.documentElement.isEqualNode(
          parsed.documentElement,
        ),
        actualSource: document.documentElement.outerHTML,
      };
    }, expectedSvgSource)),
    expectedSource: expectedSvgSource,
  });

const parentToBeTrueHandler = (
  expect as unknown as {
    toBeTrue?: (received: unknown) => { message: () => string; pass: boolean };
  }
).toBeTrue;

expect.extend({
  toBeTrue(received: PageDocumentEquivalenceToSource) {
    if (received instanceof Promise) {
      throw new Error(
        `The \`.toPass\` assertion should be used on a calculated result, not on a Promise!  E.g.:
\`\`\`typescript
expect(
  await isPageDocumentEquivalentToSvgSource(page, expectedSvgSource),
).toPass();
\`\`\`
`,
      );
    }
    if (!(received instanceof PageDocumentEquivalenceToSource)) {
      if (parentToBeTrueHandler) {
        return parentToBeTrueHandler.call(this, received);
      } else {
        throw new Error(
          `No \`.toBeTrue\` handler defined for subject of this type.  \
This handler handles only subjects of type \
\`PageDocumentEquivalenceToSource\`.  Subject: ${received}`,
        );
      }
    }

    const {
      expectedSource,
      actualSource,
      areEquivalent: isAssertionPassing,
    } = received;

    return {
      message: () => {
        const titleMessage = isAssertionPassing
          ? 'browser document is equivalent to unexpected source code.'
          : 'browser document is not equivalent to expected source code.';
        const argumentSourceCodeTitle = isAssertionPassing
          ? 'Unexpected SVG document source code'
          : 'Expected SVG document source code';

        return `${titleMessage}

${argumentSourceCodeTitle}:
${expectedSource}

Actual document source code:
${actualSource}
`;
      },
      pass: isAssertionPassing,
    };
  },
});

declare module '@rstest/core' {
  interface Assertion<T> {
    toBeTrue(): void;
  }
}
