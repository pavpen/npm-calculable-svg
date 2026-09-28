import { defineConfig } from '@rspack/cli';
import {
  type RspackOptions,
  rspack,
  type SwcLoaderOptions,
} from '@rspack/core';
import path from 'node:path';
import serveIndex from 'serve-index';

const testPreviewDir = path.resolve(__dirname, 'test-preview-dist');

const evaluateForCurrentDocumentConfiguration: RspackOptions = {
  entry: {
    'evaluate-for-current-document': './src/evaluate-for-current-document.ts',
  },
  target: ['browserslist:last 2 versions, > 0.2%, not dead, Firefox ESR'],
  resolve: {
    extensions: ['...', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        type: 'css/auto',
      },
      {
        test: /\.svg$/,
        type: 'asset',
      },
      {
        test: /\.(?:js|mjs|cjs|ts|mts|cts)$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              detectSyntax: 'auto',
            } satisfies SwcLoaderOptions,
          },
        ],
      },
    ],
  },
  plugins: [],
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: {
          minify: true,
          compress: {
            // Strip console methods used for debugging:
            pure_funcs: ['console.debug', 'console.log'],
          },
        },
      }),
    ],
  },
};

const evaluateForCurrentDocumentDebugConfiguration: RspackOptions = {
  ...evaluateForCurrentDocumentConfiguration,
  entry: {
    'evaluate-for-current-document-debug':
      './src/evaluate-for-current-document.ts',
  },
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: {
          minify: false,
          compress: {
            // Don't strip console methods used for debugging.
            pure_funcs: [],
          },
        },
      }),
    ],
  },
  devServer: {
    setupMiddlewares: (middlewares) => {
      middlewares.push({
        name: 'serve-index',
        // The same as `static.publicPath`
        path: '/',
        middleware: serveIndex(testPreviewDir, { icons: true }),
      });

      return middlewares;
    },
    static: [{ directory: testPreviewDir }],
  },
};

export default defineConfig([
  evaluateForCurrentDocumentConfiguration,
  evaluateForCurrentDocumentDebugConfiguration,
]);
