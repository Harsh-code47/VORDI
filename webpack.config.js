const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'cheap-module-source-map',
    entry: {
      'background/serviceWorker': './src/background/serviceWorker.ts',
      'offscreen/offscreen': './src/offscreen/offscreen.ts',
      'content/content': './src/content/content.ts',
      'popup/popup': './src/popup/main.tsx'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@background': path.resolve(__dirname, 'src/background'),
        '@offscreen': path.resolve(__dirname, 'src/offscreen'),
        '@content': path.resolve(__dirname, 'src/content'),
        '@popup': path.resolve(__dirname, 'src/popup'),
        'react': 'preact/compat',
        'react-dom': 'preact/compat'
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup/popup.html',
        chunks: ['popup/popup']
      }),
      new HtmlWebpackPlugin({
        template: './src/offscreen/offscreen.html',
        filename: 'offscreen/offscreen.html',
        chunks: ['offscreen/offscreen']
      }),
      new CopyPlugin({
        patterns: [
          { from: 'public/manifest.json', to: 'manifest.json' },
          { from: 'public/icons', to: 'icons', noErrorOnMissing: true },
          { from: 'models', to: 'models', noErrorOnMissing: true }
        ]
      })
    ],
    experiments: {
      asyncWebAssembly: true
    }
  };
};

