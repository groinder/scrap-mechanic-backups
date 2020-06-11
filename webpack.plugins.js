const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = [
  new ForkTsCheckerWebpackPlugin(),
  new CleanWebpackPlugin(),
  new HtmlWebpackPlugin({
    title: 'Hot Module Replacement',
  }),
];
