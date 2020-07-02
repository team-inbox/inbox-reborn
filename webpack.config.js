const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const devBuild = process.env.NODE_ENV !== 'production';

const options = {
  entry: {
    content: [
      path.join(__dirname, 'src', 'js', 'content/index.js'),
      path.join(__dirname, 'src', 'scss', 'content.scss')
    ],
    options: [
      path.join(__dirname, 'src', 'js', 'options.js'),
      path.join(__dirname, 'src', 'scss', 'options.scss')
    ],
    background: path.join(__dirname, 'src', 'js', 'background.js')
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        use: 'eslint-loader',
        include: path.join(__dirname, '../src')
      },
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        loader: 'babel-loader'
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                webpackImporter: false,
                includePaths: ['node_modules']
              }
            }
          }
        ]
      }
    ]
  },
  plugins: [
    // clean the build folder
    new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    // expose and write the allowed env vars on the compiled bundle
    new CopyWebpackPlugin([{
      from: 'src/manifest.json',
      transform(content) {
        // generates the manifest file using the package.json informations
        return Buffer.from(JSON.stringify({
          description: process.env.npm_package_description,
          version: process.env.npm_package_version,
          ...JSON.parse(content.toString())
        }));
      }
    }]),
    new CopyWebpackPlugin([{ from: 'src/images', to: 'images' }]),
    new CopyWebpackPlugin([{ from: 'src/icons', to: 'icons' }]),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'html', 'options.html'),
      filename: 'options.html',
      chunks: ['options']
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  optimization: {
    minimize: false
  }
};

if (devBuild) {
  options.devtool = 'inline-source-map';
}

module.exports = options;
