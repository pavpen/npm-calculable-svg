/**
 * Warning: Don't serialize these values, or pass them between different
 * versions of this module
 */
const ComparisonSourceNameToValue = {
  Source: 0,
  Destination: 1,
} as const;
export const ComparisonSource = {
  ...ComparisonSourceNameToValue,
  toName: (value: ComparisonSource): string => {
    switch (value) {
      case ComparisonSource.Source:
        return 'Source';
      case ComparisonSource.Destination:
        return 'Destination';
      default:
        throw new Error(`Unrecognized ComparisonSource value: ${value}!`);
    }
  },
} as const;
export type ComparisonSource =
  (typeof ComparisonSourceNameToValue)[keyof typeof ComparisonSourceNameToValue];

export type ElementChildIndexPath = number[];

const elementChildIndexPathToXPath = (path: ElementChildIndexPath): string =>
  `//${path.map((i) => `*[${i}]`).join('/')}`;

export class AttributePath {
  readonly elementChildIndexPath: ElementChildIndexPath;
  readonly attributeName: string;

  constructor({
    elementChildIndexPath,
    attributeName,
  }: {
    elementChildIndexPath: ElementChildIndexPath;
    attributeName: string;
  }) {
    this.elementChildIndexPath = elementChildIndexPath;
    this.attributeName = attributeName;
  }

  toString(): string {
    const elementXPath = elementChildIndexPathToXPath(
      this.elementChildIndexPath,
    );
    const infix = elementXPath === '//' ? '' : '/';

    return `${elementXPath}${infix}@${this.attributeName}`;
  }
}

export class UnequalAttributeValues {
  readonly sourceAttributePath: AttributePath;
  readonly sourceValue: string;
  readonly destinationAttributePath: AttributePath;
  readonly destinationValue: string;

  constructor({
    sourceAttributePath,
    sourceValue,
    destinationAttributePath,
    destinationValue,
  }: {
    sourceAttributePath: AttributePath;
    sourceValue: string;
    destinationAttributePath: AttributePath;
    destinationValue: string;
  }) {
    this.sourceAttributePath = sourceAttributePath;
    this.sourceValue = sourceValue;
    this.destinationAttributePath = destinationAttributePath;
    this.destinationValue = destinationValue;
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      sourceAttributePath: this.sourceAttributePath.toString(),
      sourceValue: this.sourceValue,
      destinationAttributePath: this.destinationAttributePath.toString(),
      destinationValue: this.destinationValue,
    });
  }
}

export class MissingAttribute {
  readonly attributePath: AttributePath;
  readonly missLocation: ComparisonSource;

  constructor({
    missingPath: attributePath,
    missComparand: missLocation,
  }: {
    missingPath: AttributePath;
    missComparand: ComparisonSource;
  }) {
    this.attributePath = attributePath;
    this.missLocation = missLocation;
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      attributePath: this.attributePath.toString(),
      missLocation: ComparisonSource.toName(this.missLocation),
    });
  }
}

export class UnequalTextNodes {
  readonly sourceNodePath: ElementChildIndexPath;
  readonly sourceValue: string;
  readonly destinationNodePath: ElementChildIndexPath;
  readonly destinationValue: string;

  constructor({
    sourceNodePath,
    sourceValue,
    destinationNodePath,
    destinationValue,
  }: {
    sourceNodePath: ElementChildIndexPath;
    sourceValue: string;
    destinationNodePath: ElementChildIndexPath;
    destinationValue: string;
  }) {
    this.sourceNodePath = sourceNodePath;
    this.sourceValue = sourceValue;
    this.destinationNodePath = destinationNodePath;
    this.destinationValue = destinationValue;
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      sourceNodePath: elementChildIndexPathToXPath(this.sourceNodePath),
      sourceValue: this.sourceValue,
      destinationNodePath: elementChildIndexPathToXPath(
        this.destinationNodePath,
      ),
      destinationValue: this.destinationValue,
    });
  }
}

export class DifferentElementOrder {
  readonly sourceElementPath: ElementChildIndexPath;
  readonly destinationElementPath: ElementChildIndexPath;

  constructor({
    sourceElementPath,
    destinationElementPath,
  }: {
    sourceElementPath: ElementChildIndexPath;
    destinationElementPath: ElementChildIndexPath;
  }) {
    this.sourceElementPath = sourceElementPath;
    this.destinationElementPath = destinationElementPath;
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      sourceElementPath: elementChildIndexPathToXPath(this.sourceElementPath),
      destinationElementPath: elementChildIndexPathToXPath(
        this.destinationElementPath,
      ),
    });
  }
}

export class MissingElement {
  readonly elementPath: ElementChildIndexPath;
  readonly missLocation: ComparisonSource;

  constructor({
    elementPath,
    missLocation,
  }: {
    elementPath: ElementChildIndexPath;
    missLocation: ComparisonSource;
  }) {
    this.elementPath = elementPath;
    this.missLocation = missLocation;
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      elementPath: elementChildIndexPathToXPath(this.elementPath),
      missLocation: ComparisonSource.toName(this.missLocation),
    });
  }
}

export class DifferenceList {
  readonly unequalAttributeValues: UnequalAttributeValues[] = [];
  readonly missingAttributes: MissingAttribute[] = [];
  readonly unequalTextNodes: UnequalTextNodes[] = [];
  readonly elementOrderDifferences: DifferentElementOrder[] = [];
  readonly missingElements: MissingElement[] = [];

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      unequalAttributeValues: this.unequalAttributeValues.map((v) =>
        v.toWebBuiltIns(),
      ),
      missingAttributes: this.missingAttributes.map((v) => v.toWebBuiltIns()),
      unequalTextNodes: this.unequalTextNodes.map((v) => v.toWebBuiltIns()),
      elementOrderDifferences: this.elementOrderDifferences.map((v) =>
        v.toWebBuiltIns(),
      ),
      missingElements: this.missingElements.map((v) => v.toWebBuiltIns()),
    });
  }
}
