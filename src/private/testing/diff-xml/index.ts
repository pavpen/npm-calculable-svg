import { XMLParser } from 'fast-xml-parser';
import {
  AttributePath,
  ComparisonSource as ComparisonComparand,
  DifferenceList,
  DifferentElementOrder,
  MissingAttribute,
  MissingElement,
  UnequalAttributeValues,
  UnequalTextNodes,
} from './xml-differences';

type XmlAttrNameToValue = Record<string, string | number | boolean | object>;
type XmlNode = Array<
  Record<string, XmlNode> | Record<':@', XmlAttrNameToValue>
>;

export const diffXmlStrings = (
  sourceXmlString: string,
  destinationXmlString: string,
): DifferenceList => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    preserveOrder: true,
    attributesGroupName: '#attrs',
    attributeNamePrefix: '',
  });
  const sourceXml = parser.parse(sourceXmlString);
  const destinationXml = parser.parse(destinationXmlString);
  const calculator = new XmlDiffCalculator();

  calculator.appendSubtreeDiffs(sourceXml, destinationXml);

  return calculator.outputDifferenceList;
};

const isNotAttributesKey = (key: string): boolean => key !== ':@';
const isNotAttributesEntry = ([key, _value]: [
  string,
  XmlNode | XmlAttrNameToValue,
]): boolean => key !== ':@';
const getChildNodeTagName = (
  childNode: Record<string, XmlNode> | Record<':@', XmlAttrNameToValue>,
): string => Object.keys(childNode).filter(isNotAttributesKey)[0];

class XmlDiffCalculator {
  readonly outputDifferenceList: DifferenceList = new DifferenceList();
  readonly sourceChildIndexPath: number[] = [];
  readonly destinationChildIndexPath: number[] = [];

  appendSubtreeDiffs(sourceNode: XmlNode, destinationNode: XmlNode): void {
    const isSourceTextNode = typeof sourceNode !== 'object';

    if (isSourceTextNode) {
      const isDestinationTextNode = typeof destinationNode !== 'object';
      if (!isDestinationTextNode) {
        throw new Error(
          `Comparing a text node to a non-text node!  This should never \
happen!  sourceNode: ${JSON.stringify(sourceNode)}, \
destinationNode: ${JSON.stringify(destinationNode)}!`,
        );
      }

      if (sourceNode !== destinationNode) {
        this.outputDifferenceList.unequalTextNodes.push(
          new UnequalTextNodes({
            sourceNodePath: [...this.sourceChildIndexPath],
            sourceValue: sourceNode,
            destinationNodePath: [...this.destinationChildIndexPath],
            destinationValue: destinationNode,
          }),
        );
      }
      return;
    }

    const sourceRevNodes = [...sourceNode].reverse();
    const destinationRevNodes = [...destinationNode].reverse();
    const skipDestIndex: boolean[] = [];

    while (sourceRevNodes.length > 0) {
      while (
        destinationRevNodes.length > 0 &&
        skipDestIndex[destinationRevNodes.length - 1]
      ) {
        destinationRevNodes.pop();
      }
      if (destinationRevNodes.length < 1) {
        break;
      }
      const sourceIndexFromEnd = sourceRevNodes.length - 1;
      const destIndexFromEnd = destinationRevNodes.length - 1;
      const sourceChild = sourceRevNodes[sourceIndexFromEnd];
      const destChild = destinationRevNodes[destIndexFromEnd];
      const [sourceKey, sourceChildNode] =
        Object.entries(sourceChild).filter(isNotAttributesEntry)[0];
      const [destKey, destChildNode] =
        Object.entries(destChild).filter(isNotAttributesEntry)[0];

      if (sourceKey === destKey) {
        this.sourceChildIndexPath.push(
          sourceNode.length - 1 - sourceIndexFromEnd,
        );
        this.destinationChildIndexPath.push(
          destinationNode.length - 1 - destIndexFromEnd,
        );
        this.appendAttributeDiffs(
          sourceChild[':@'] as XmlAttrNameToValue,
          destChild[':@'] as XmlAttrNameToValue,
        );
        this.appendSubtreeDiffs(sourceChildNode, destChildNode);
        this.sourceChildIndexPath.pop();
        this.destinationChildIndexPath.pop();
        sourceRevNodes.pop();
        destinationRevNodes.pop();
      } else {
        const destKeysFromEnd = destinationRevNodes.map(getChildNodeTagName);
        const destKeyIndexFromEnd = destKeysFromEnd.lastIndexOf(sourceKey);

        if (destKeyIndexFromEnd >= 0) {
          this.sourceChildIndexPath.push(
            sourceNode.length - 1 - sourceIndexFromEnd,
          );
          this.destinationChildIndexPath.push(
            destinationNode.length - 1 - destKeyIndexFromEnd,
          );
          this.outputDifferenceList.elementOrderDifferences.push(
            new DifferentElementOrder({
              sourceElementPath: [...this.sourceChildIndexPath],
              destinationElementPath: [...this.destinationChildIndexPath],
            }),
          );
          const [_destKey, destChildNode] = Object.entries(
            destinationNode[destKeyIndexFromEnd],
          ).filter(isNotAttributesEntry)[0];
          this.appendAttributeDiffs(
            sourceChild[':@'] as XmlAttrNameToValue,
            destinationNode[destKeyIndexFromEnd][':@'] as XmlAttrNameToValue,
          );
          this.appendSubtreeDiffs(sourceChildNode, destChildNode);
          this.sourceChildIndexPath.pop();
          this.destinationChildIndexPath.pop();
          sourceRevNodes.pop();
          skipDestIndex[destKeyIndexFromEnd] = true;
        } else {
          this.outputDifferenceList.missingElements.push(
            new MissingElement({
              elementPath: [...this.sourceChildIndexPath, sourceIndexFromEnd],
              missLocation: ComparisonComparand.Source,
            }),
          );
          sourceRevNodes.pop();
        }
      }
    }

    while (sourceRevNodes.length > 0) {
      const sourceIndexFromEnd = sourceRevNodes.length - 1;

      this.outputDifferenceList.missingElements.push(
        new MissingElement({
          elementPath: [
            ...this.sourceChildIndexPath,
            sourceNode.length - 1 - sourceIndexFromEnd,
          ],
          missLocation: ComparisonComparand.Source,
        }),
      );
    }

    while (
      destinationRevNodes.length > 0 &&
      skipDestIndex[destinationRevNodes.length - 1]
    ) {
      destinationRevNodes.pop();
    }
    while (destinationRevNodes.length > 0) {
      const destIndexFromEnd = destinationRevNodes.length - 1;

      this.outputDifferenceList.missingElements.push(
        new MissingElement({
          elementPath: [
            ...this.sourceChildIndexPath,
            destinationNode.length - 1 - destIndexFromEnd,
          ],
          missLocation: ComparisonComparand.Destination,
        }),
      );
    }
  }

  appendAttributeDiffs(
    sourceAttributes: XmlAttrNameToValue,
    destinationAttributes: XmlAttrNameToValue,
  ): void {
    if (typeof sourceAttributes === 'undefined') {
      if (typeof destinationAttributes !== 'undefined') {
        for (const attributeName of Object.keys(destinationAttributes)) {
          this.appendMissingSourceAttribute(attributeName);
        }
      }
      return;
    }
    if (typeof destinationAttributes === 'undefined') {
      for (const attributeName of Object.keys(sourceAttributes)) {
        this.appendMissingDestinationAttribute(attributeName);
      }
      return;
    }

    for (const [attributeName, sourceValue] of Object.entries(
      sourceAttributes,
    )) {
      const destinationValue = destinationAttributes[attributeName];

      if (typeof destinationValue === 'undefined') {
        this.appendMissingDestinationAttribute(attributeName);
      } else if (sourceValue !== destinationValue) {
        this.outputDifferenceList.unequalAttributeValues.push(
          new UnequalAttributeValues({
            sourceAttributePath: new AttributePath({
              elementChildIndexPath: [...this.sourceChildIndexPath],
              attributeName,
            }),
            sourceValue: sourceValue.toString(),
            destinationAttributePath: new AttributePath({
              elementChildIndexPath: [...this.destinationChildIndexPath],
              attributeName,
            }),
            destinationValue: destinationValue.toString(),
          }),
        );
      }
    }

    for (const attributeName of Object.keys(destinationAttributes)) {
      const sourceValue = sourceAttributes[attributeName];

      if (typeof sourceValue === 'undefined') {
        this.appendMissingSourceAttribute(attributeName);
      }
    }
  }

  private appendMissingSourceAttribute(attributeName: string): void {
    this.outputDifferenceList.missingAttributes.push(
      new MissingAttribute({
        missingPath: new AttributePath({
          elementChildIndexPath: [...this.sourceChildIndexPath],
          attributeName,
        }),
        missComparand: ComparisonComparand.Source,
      }),
    );
  }

  private appendMissingDestinationAttribute(attributeName: string): void {
    this.outputDifferenceList.missingAttributes.push(
      new MissingAttribute({
        missingPath: new AttributePath({
          elementChildIndexPath: [...this.destinationChildIndexPath],
          attributeName,
        }),
        missComparand: ComparisonComparand.Destination,
      }),
    );
  }
}
