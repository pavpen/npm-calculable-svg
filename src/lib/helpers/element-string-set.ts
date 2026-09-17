/**
 * A non-iterable set of values, each of which can be represented as an
 * (Element, string) tuple
 *
 * This is a work-around for JavaScript's limitation of using objects as set
 * elements
 */
export class NonIterableElementStringSet {
  private readonly contents: Map<Element, Set<string>> = new Map();

  protected addFromComponents(
    elementComponent: Element,
    stringComponent: string,
  ) {
    let slot = this.contents.get(elementComponent);

    if (typeof slot === 'undefined') {
      slot = new Set();
      this.contents.set(elementComponent, slot);
    }
    slot.add(stringComponent);
  }

  protected deleteElementWithComponents(
    elementComponent: Element,
    stringComponent: string,
  ): boolean {
    const slot = this.contents.get(elementComponent);

    if (typeof slot === 'undefined') {
      return false;
    }
    const result = slot.delete(stringComponent);
    if (slot.size < 1) {
      this.contents.delete(elementComponent);
    }

    return result;
  }

  protected hasElementWithComponents(
    elementComponent: Element,
    stringComponent: string,
  ): boolean {
    const slot = this.contents.get(elementComponent);

    if (typeof slot === 'undefined') {
      return false;
    }
    return slot.has(stringComponent);
  }

  protected elementComponentValues(): Array<[Element, string]> {
    const result: [Element, string][] = [];

    for (const [elementComponent, slot] of this.contents.entries()) {
      for (const stringComponent of slot.values()) {
        result.push([elementComponent, stringComponent]);
      }
    }

    return result;
  }
}
