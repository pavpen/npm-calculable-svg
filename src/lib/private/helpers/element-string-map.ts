export class NonIterableElementStringMap<Value> {
  private readonly contents: Map<Element, Map<string, Value>> = new Map();

  protected setWithKeyComponents(
    keyElement: Element,
    keyString: string,
    value: Value,
  ): NonIterableElementStringMap<Value> {
    const slot = this.contents.get(keyElement);

    if (typeof slot === 'undefined') {
      this.contents.set(
        keyElement,
        new Map<string, Value>([[keyString, value]]),
      );
    } else {
      slot.set(keyString, value);
    }

    return this;
  }

  protected getWithKeyComponents(
    keyElement: Element,
    keyString: string,
  ): Value | undefined {
    const slot = this.contents.get(keyElement);

    return slot?.get(keyString);
  }

  protected synthesizeEntriesWithKeyComponents(): Array<
    [Element, string, Value]
  > {
    const result: Array<[Element, string, Value]> = [];

    for (const [keyElement, slot] of this.contents.entries()) {
      for (const [keyString, value] of slot.entries()) {
        result.push([keyElement, keyString, value]);
      }
    }

    return result;
  }

  protected synthesizeKeyComponents(): Array<[Element, string]> {
    const result: Array<[Element, string]> = [];

    for (const [keyElement, slot] of this.contents.entries()) {
      for (const keyString of slot.keys()) {
        result.push([keyElement, keyString]);
      }
    }

    return result;
  }

  protected stringComponentsForElement(keyElement: Element): Iterable<string> {
    return this.contents.get(keyElement)?.keys() ?? [];
  }
}
