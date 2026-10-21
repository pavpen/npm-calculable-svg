export interface ImmutableMap<Key, Value> {
  get(key: Key): Value | undefined;
}
