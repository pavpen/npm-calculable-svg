import fs from 'node:fs/promises';

export class CsvgTransformer {
  /**
   * Updates the path to `evaluate-for-current-document-debug.js`.  TypeDoc
   * uses a flat layout under `media/`.
   */
  transformString(csvgSource: string): string {
    return csvgSource.replace(
      /(<script crossorigin="anonymous" href=")[.][.]\/(evaluate-for-current-document-debug[.]js"><\/script>)/,
      '$1$2',
    );
  }

  async transformFile(path: string): Promise<void> {
    const inputContent = (await fs.readFile(path)).toString();
    const outputContent = this.transformString(inputContent);

    console.log('Transforming.', { path });

    await fs.writeFile(path, outputContent);
  }
}
