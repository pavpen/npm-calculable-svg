import { Writable } from 'node:stream';

/**
 * A writable that accumulates octet chunks, which can be converted to a
 * string when closed
 *
 * See <https://beta.docs.nodejs.org/stream/api-for-stream-implementers>.
 */
export class WritableStringBuffer extends Writable {
  private readonly chunks: Buffer[] = [];
  private encoding: BufferEncoding | undefined;

  constructor(options?: {
    defaultEncoding?: BufferEncoding;
    emitClose?: boolean;
    autoDestroy?: boolean;
  }) {
    super({
      ...options,
      decodeStrings: false,
    });
  }

  _write(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (!(chunk instanceof Buffer)) {
      const e = new Error(`Received a non-Buffer chunk: ${chunk}!`);
      callback(e);
      return;
    }
    if (typeof this.encoding === 'undefined') {
      this.encoding = encoding;
    } else {
      if (encoding !== this.encoding) {
        const e = new Error(
          `Received a chunk with an encoding, different than that of previous chunks: ${chunk}, ${encoding}!`,
        );
        callback(e);
        return;
      }
    }

    this.chunks.push(chunk);
    callback();
  }

  toString(): string {
    const chunks = this.chunks;
    let buffer: Buffer;
    if (chunks.length !== 1) {
      buffer = Buffer.concat(chunks);
      this.chunks.length = 0;
      this.chunks.push(buffer);
    } else {
      buffer = chunks[0];
    }

    return buffer.toString();
  }
}
