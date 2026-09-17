import type { Hasher } from './hashable';
import type { Comparator } from './obj-map';

/**
 * Like `Set<Value>`, but without insertion-order iteration, and value objects
 * with custom hashing, and comparison functions
 *
 * This is mostly to get around the limitations of the JavaScript built-in
 * `Set` supporting only element comparison by reference.  See
 * <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#value_equality>.
 *
 * This is not a well-optimized implementation.
 *
 * TODO(pavel.penev): Support insertion-order iteration
 *
 * TODO(pavel.penev): Support Red-Black tree buckets for high collision counts
 * E.g., see <https://arxiv.org/html/2607.26530v1>.
 */
export class ObjSet<Value> {
  /**
   * We store `set.add(value)` in bucket `contents.get(hash(value))`.
   *
   * The bucket is an array in the format `[value1, value2, . . .]`.
   */
  private readonly contents: Map<number, Array<Value>> = new Map();

  private readonly hasher: Hasher<Value>;
  private readonly comparator: Comparator<Value>;

  constructor({
    hasher,
    comparator,
  }: { hasher: Hasher<Value>; comparator: Comparator<Value> }) {
    this.hasher = hasher;
    this.comparator = comparator;
  }

  has(value: Value): boolean {
    const bucket = this.contents.get(this.hasher(value));

    if (typeof bucket === 'undefined') {
      return false;
    }

    return bucket.some(
      (existingValue) => this.comparator(existingValue, value) === 0,
    );
  }

  add(value: Value): ObjSet<Value> {
    const hash = this.hasher(value);
    const bucket = this.contents.get(hash);

    if (typeof bucket === 'undefined') {
      this.contents.set(hash, [value]);
    } else {
      if (
        !bucket.some(
          (existingValue) => this.comparator(value, existingValue) === 0,
        )
      ) {
        bucket.push(value);
      }
    }

    return this;
  }
}
