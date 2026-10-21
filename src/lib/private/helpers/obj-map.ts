import type { Hasher } from './hashable';

/**
 * Generic function that provides total ordering for objects of type `Value`
 *
 * The return value must be an integer, which is:
 * * < 0, if `comparand1 < comparand2`,
 * * 0, if `comparand1 == comparand2`,
 * * > 0, if `comparand1 > comparand2`
 */
export type Comparator<Value> = (
  comparand1: Value,
  comparand2: Value,
) => number;

/**
 * Like `Map<Key, Value>`, but without insertion-order iteration, and
 * supporting key, and value objects with custom hashing, and comparison
 * functions
 *
 * This is mostly to get around the limitations of the JavaScript built-in
 * `Map` supporting only key comparison by reference.  See
 * <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#key_equality>.
 *
 * This is not a well-optimized implementation.
 *
 * TODO(pavel.penev): Support insertion-order iteration
 *
 * TODO(pavel.penev): Support Red-Black tree buckets for high collision counts
 * E.g., see <https://arxiv.org/html/2607.26530v1>.
 *
 * TODO(pavel.penev): Optimize for keys, or values that are homogenous
 * primitive types like Int32, Float64, boolean
 */
export class ObjMap<Key, Value> {
  /**
   * We store `map[key] = value` in bucket `contents.get(hash(key))`.
   *
   * The bucket is an array in the format
   * `[key1, value1, key2, value2, . . .]`.
   */
  private readonly contents: Map<number, Array<Key | Value>> = new Map();

  private readonly keyHasher: Hasher<Key>;
  private readonly keyComparator: Comparator<Key>;

  constructor({
    keyHasher,
    keyComparator,
  }: { keyHasher: Hasher<Key>; keyComparator: Comparator<Key> }) {
    this.keyHasher = keyHasher;
    this.keyComparator = keyComparator;
  }

  get(key: Key): Value | undefined {
    const bucket = this.contents.get(this.keyHasher(key));

    if (typeof bucket === 'undefined') {
      return undefined;
    }
    for (let i = 0; i < bucket.length; i += 2) {
      const existingKey = bucket[i] as Key;

      if (this.keyComparator(key, existingKey) === 0) {
        return bucket[i + 1] as Value;
      }
    }

    return undefined;
  }

  set(key: Key, value: Value): ObjMap<Key, Value> {
    const hash = this.keyHasher(key);
    const bucket = this.contents.get(hash);

    if (typeof bucket === 'undefined') {
      this.contents.set(hash, [key, value]);
    } else {
      this.setInBucket(key, value, bucket);
    }

    return this;
  }

  private setInBucket(
    key: Key,
    value: Value,
    bucket: Array<Key | Value>,
  ): void {
    for (let i = 0; i < bucket.length; i += 2) {
      const existingKey = bucket[i] as Key;

      if (this.keyComparator(key, existingKey) === 0) {
        bucket[i + 1] = value;
        return;
      }
    }

    bucket.push(key);
    bucket.push(value);
  }
}
