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
  '//' + path.map((i) => `*[${i}]`).join('/');

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

  toJsValue(): string {
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
  readonly destiantionValue: string;

  constructor({
    sourceAttributePath,
    sourceValue,
    destinationAttributePath,
    destiantionValue,
  }: {
    sourceAttributePath: AttributePath;
    sourceValue: string;
    destinationAttributePath: AttributePath;
    destiantionValue: string;
  }) {
    this.sourceAttributePath = sourceAttributePath;
    this.sourceValue = sourceValue;
    this.destinationAttributePath = destinationAttributePath;
    this.destiantionValue = destiantionValue;
  }

  toJsValue() {
    return {
      sourceAttributePath: this.sourceAttributePath.toJsValue(),
      sourceValue: this.sourceValue,
      destinationAttributePath: this.destinationAttributePath.toJsValue(),
      destiantionValue: this.destiantionValue,
    };
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

  toJsValue() {
    return {
      attributePath: this.attributePath.toJsValue(),
      missLocation: ComparisonSource.toName(this.missLocation),
    };
  }
}

export class UnequalTextNodes {
  readonly sourceNodePath: ElementChildIndexPath;
  readonly sourceValue: string;
  readonly destinationNodePath: ElementChildIndexPath;
  readonly destiantionValue: string;

  constructor({
    sourceNodePath,
    sourceValue,
    destinationNodePath,
    destiantionValue,
  }: {
    sourceNodePath: ElementChildIndexPath;
    sourceValue: string;
    destinationNodePath: ElementChildIndexPath;
    destiantionValue: string;
  }) {
    this.sourceNodePath = sourceNodePath;
    this.sourceValue = sourceValue;
    this.destinationNodePath = destinationNodePath;
    this.destiantionValue = destiantionValue;
  }

  toJsValue() {
    return {
      sourceNodePath: elementChildIndexPathToXPath(this.sourceNodePath),
      sourceValue: this.sourceValue,
      destinationNodePath: elementChildIndexPathToXPath(
        this.destinationNodePath,
      ),
      destiantionValue: this.destiantionValue,
    };
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

  toJsValue() {
    return {
      sourceElementPath: elementChildIndexPathToXPath(this.sourceElementPath),
      destinationElementPath: elementChildIndexPathToXPath(
        this.destinationElementPath,
      ),
    };
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

  toJsValue() {
    return {
      elementPath: elementChildIndexPathToXPath(this.elementPath),
      missLocation: ComparisonSource.toName(this.missLocation),
    };
  }
}

export class DifferenceList {
  readonly unequalAttributeValues: UnequalAttributeValues[] = [];
  readonly missingAttributes: MissingAttribute[] = [];
  readonly unequalTextNodes: UnequalTextNodes[] = [];
  readonly elementOrderDifferences: DifferentElementOrder[] = [];
  readonly missingElements: MissingElement[] = [];

  toJsValue() {
    return {
      unequalAttributeValues: this.unequalAttributeValues.map((v) =>
        v.toJsValue(),
      ),
      missingAttributes: this.missingAttributes.map((v) => v.toJsValue()),
      unequalTextNodes: this.unequalTextNodes.map((v) => v.toJsValue()),
      elementOrderDifferences: this.elementOrderDifferences.map((v) =>
        v.toJsValue(),
      ),
      missingElements: this.missingElements.map((v) => v.toJsValue()),
    };
  }
}
