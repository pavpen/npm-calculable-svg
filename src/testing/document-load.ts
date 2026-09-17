export const waitForDocumentLoaded: (document: Document) => Promise<void> = (
  document,
) =>
  new Promise((resolve, reject) => {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => resolve());
      } else {
        resolve();
      }
    } catch (e) {
      reject(e);
    }
  });
