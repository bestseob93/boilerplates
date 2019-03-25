const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = {
    entry: {
        app: './src/index.js'
    },
    output: {
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist')
    },
    optimization: { // 목적: 업데이트 시 같은 파일명으로 배포 시 브라우저 캐싱으로 인해 업데이트가 이뤄지지 않는다.
        runtimeChunk: 'single', // 런타임은 웹팩 환경으로 파일들에서 import나 require 등이 문법에 상관 없이 __webpack_require__ 로 변환되는 등의 작업을 한다.
        splitChunks: { // node_modules에서 import 한 파일들은 수정될 일이 거의 없으므로 따로 chunk하여 캐싱되게 한다.
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    }, // 이렇게 구성되면 배포 시 src에 있는 파일 변동에만 hash를 적용하여 캐싱을 방지한다.
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader'
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                use: [
                    'file-loader'
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: 'Caching'
        })
    ]
}