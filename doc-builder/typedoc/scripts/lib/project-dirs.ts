import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class ProjectDirs {
  readonly projectRootDir: string;

  constructor(projectRootDir?: string) {
    if (typeof projectRootDir === 'undefined') {
      const selfPath = fileURLToPath(import.meta.url);
      const docBuilderScriptsDir = path.dirname(path.dirname(selfPath));
      const docBuilderProjectDir = path.dirname(docBuilderScriptsDir);
      const docBuildDir = path.dirname(docBuilderProjectDir);

      this.projectRootDir = path.dirname(docBuildDir);
    } else {
      this.projectRootDir = projectRootDir;
    }
  }

  get docBuilderDir(): string {
    return path.join(this.projectRootDir, 'doc-builder');
  }

  get docBuilderProjectDir(): string {
    return path.join(this.docBuilderDir, 'typedoc');
  }

  get docBuilderScriptsDir(): string {
    return path.join(this.docBuilderProjectDir, 'scripts');
  }

  get docBuildTemporaryArtifactsDir(): string {
    return path.join(this.docBuilderDir, 'build');
  }

  /**
   * Where example SVGs for the XML API documentation, pre-processed for
   * TypeDoc are output
   */
  get outputXmlApiExamplesDir(): string {
    return path.join(this.docBuildTemporaryArtifactsDir, 'xml-api', 'examples');
  }

  get examplesSourceDir(): string {
    return path.join(this.projectRootDir, 'examples');
  }

  get distDir(): string {
    return path.join(this.projectRootDir, 'dist');
  }

  /**
   * The directory, under which documentation is generated with one
   * sub-directory per package version
   */
  get docOutputRootDir(): string {
    return path.join(this.distDir, 'doc');
  }

  /**
   * The root directory under which TypeDoc outputs built documentation
   */
  get typedocOutputDir(): string {
    return path.join(this.docOutputRootDir, 'dev');
  }

  /**
   * Where TypeDoc outputs 'media' files, such as SVGs
   */
  get typedocOutputMediaDir(): string {
    return path.join(this.typedocOutputDir, 'media');
  }

  /**
   * Where different commits of the repository are checked out as
   * subdirectories in order to build documentation for different releases
   */
  get docBuildSourceWorktreesDir(): string {
    return path.join(this.docBuildTemporaryArtifactsDir, 'src-worktrees');
  }

  get docVersionSelectionPageSourceDir(): string {
    return path.join(this.docBuilderProjectDir, 'version-selection-page');
  }

  get docVersionSelectionPageStagingDir(): string {
    return path.join(
      this.docBuildTemporaryArtifactsDir,
      'version-selection-page',
      'staging',
    );
  }

  get docVersionSelectionPageOutputDir(): string {
    return path.join(
      this.docBuildTemporaryArtifactsDir,
      'version-selection-page',
      'dist',
    );
  }

  get docVersionSelectionPageStagingEntryPointFile(): string {
    return path.join(
      this.docVersionSelectionPageStagingDir,
      'version-selection-page.ts',
    );
  }
}
