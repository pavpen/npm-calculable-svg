import type { DistPathConfig, OutputConfig } from '@rsbuild/core';
import { defineConfig, type LibConfig } from '@rslib/core';

type CustomLibConfig = Omit<LibConfig, 'output'> & {
  output: Omit<OutputConfig, 'distPath'> & { distPath: DistPathConfig };
};
const esmBuildConfig: CustomLibConfig = {
  format: 'esm',
  syntax: 'es2021',
  dts: true,
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
  output: {
    target: 'node',
    distPath: { root: './dist/esm' },
    minify: true,
  },
  performance: {
    removeConsole: ['debug', 'log', 'info'],
  },
};
const umdBuildConfig: CustomLibConfig = {
  ...esmBuildConfig,
  format: 'umd',
  // Try to avoid global name collisions:
  umdName: 'pavpenProCsvg',
  output: {
    distPath: { root: './dist/umd' },
    target: 'web',
  },
};

const toDebugBuildConfig = (prodConfig: CustomLibConfig): CustomLibConfig => {
  return {
    ...prodConfig,
    source: {
      ...prodConfig.source,
      entry: {
        'index-debug': './src/index-debug.ts',
      },
    },
    output: {
      ...prodConfig.output,
      minify: false,
      distPath: {
        ...prodConfig.output.distPath,
        root: `${prodConfig.output.distPath.root}.debug`,
      },
    },
    performance: {
      ...prodConfig.performance,
      // Include `console` statements:
      removeConsole: undefined,
    },
  };
};

export default defineConfig({
  lib: [
    esmBuildConfig,
    umdBuildConfig,
    toDebugBuildConfig(esmBuildConfig),
    toDebugBuildConfig(umdBuildConfig),
  ],
});
