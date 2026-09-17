export type Hasher<Value> = (value: Value) => number;

export namespace hash {
  export namespace non_crypto {
    export const hashCodeForString = (value: string): number =>
      sdbm.hashCodeForString(value);
    export const combineHashCodes = (...hashCodes: number[]): number =>
      jenkins.combine(...hashCodes);
  }

  export namespace sdbm {
    /**
     * Non-cryptographically-safe, quick, and common string hash calculator
     *
     * * See <https://api.riot-os.org/group__sys__hashes__sdbm.html>.
     * * Example implementation:
     *   <https://github.com/Chalarangelo/30-seconds-of-code/blob/master/content/snippets/js/s/hash-string-into-number.md>
     */
    export const hashCodeForString = (value: string): number => {
      let result = 0;
      for (let i = 0; i < value.length; ++i) {
        // (* 2^6 + * 2^16 - * 1) = (* 64 + * 65536 - * 1) = (* 65599)
        result = value.charCodeAt(i) + (result << 6) + (result << 16) - result;
      }

      return result;
    };
  }

  export namespace jenkins {
    /**
     * Use this to compute non-cryptographically-safe hashes from other hashes,
     * together with {@link finishCombining}
     *
     * E.g.:
     *
     * ```typescript
     * let collectionHash = 0;
     * for (const item of collection) {
     *   collectionHash = combineIntermediates(collectionHash, hasher(item));
     * }
     * collectionHash = finishCombining(collectionHash);
     * ```
     *
     * Uses the
     * [Jenkins 'one at a time'](https://en.wikipedia.org/wiki/Jenkins_hash_function)
     * hash-combining algorithm.
     *
     * Corresponds, to
     * [`SystemHash.combine` in Dart](https://github.com/dart-lang/sdk/blob/main/sdk/lib/internal/internal.dart#L179-L183).
     */
    const combineIntermediates = (
      hashCodeA: number,
      hashCodeB: number,
    ): number => {
      let result = hashCodeA + hashCodeB;
      result += result << 10;
      result ^= result >> 6;

      return result;
    };

    /**
     * Use after {@link combineIntermediates}.
     */
    const finishCombining = (intermediateHash: number): number => {
      let result = intermediateHash + (intermediateHash << 3);
      result ^= result >> 11;
      result += result << 15;

      return result;
    };

    /**
     * Computes a non-cryptographically-safe hash from an ordered list of
     * hashes
     */
    export const combine = (...hasheCodes: number[]): number => {
      let result = 0;
      for (const hash of hasheCodes) {
        result = combineIntermediates(result, hash);
      }

      return finishCombining(result);
    };
  }
}
