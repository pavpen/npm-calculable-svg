import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class ProjectDirs {
  get scriptsDir(): string {
    const scriptSelfPath = fileURLToPath(import.meta.url);

    return path.dirname(path.dirname(scriptSelfPath));
  }

  get docBuildNodeProjectDir(): string {
    return path.dirname(this.scriptsDir);
  }

  get docBuildDir(): string {
    return path.dirname(this.docBuildNodeProjectDir);
  }

  get docBuildTemporaryArtifactsDir(): string {
    return path.join(this.docBuildDir, 'build');
  }

  get outputXmlApiExamplesDir(): string {
    return path.join(this.docBuildTemporaryArtifactsDir, 'xml-api', 'examples');
  }

  get projectRootDir(): string {
    return path.dirname(this.docBuildDir);
  }

  get examplesSourceDir(): string {
    return path.join(this.projectRootDir, 'examples');
  }

  get distDir(): string {
    return path.join(this.projectRootDir, 'dist');
  }

  get typedocOutputDir(): string {
    return path.join(this.distDir, 'doc');
  }

  get typedocOutputMediaDir(): string {
    return path.join(this.typedocOutputDir, 'media');
  }
}
