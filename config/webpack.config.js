const path = require('path')
const fs = require('fs')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const InlineChunkHtmlPlugin = require('inline-manifest-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const ManifestPlugin = require('webpack-manifest-plugin')

const appDirectory = fs.realpathSync(process.cwd()) // 디렉토리 경로

const resolveApp = function(relativePath) {
    return path.resolve(appDirectory, relativePath)
}

const paths = {
    appPath: resolveApp('src/index.js'),
    appHtml: resolveApp('public/index.html'),
    buildPath: resolveApp('dist'),
    appSrc: resolveApp('src'),
    appNodeModules: resolveApp('node_modules')
}

module.exports = env => {
    const isEnvDevelopment = env.NODE_ENV === 'development'
    const isEnvProduction = env.NODE_ENV === 'production'

    return {
        mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
        entry: {
            app: paths.appPath
        },
        output: {
            filename: isEnvProduction
                ? 'assets/js/[name].[chunkhash:8].js'
                : isEnvDevelopment && 'assets/js/bundle.js',
            // 코드 스플리팅을 사용한다면 추가적인 청크 파일이 존재할 수 있음.
            // filename을 배포와 개발 모드로 분리하는 이유는 chunkhash가 개발 모드에서 컴파일 시간을 증가시키기 떄문.
            chunkFilename: isEnvProduction
                ? 'assets/js/[name].[chunkhash:8].chunk.js'
                : isEnvDevelopment && 'assets/js/[name].chunk.js',
            path: isEnvProduction ? paths.buildPath : undefined
        },
        resolve: {
            // extensions 추가 전/후
            // 전: import file from './file.js'
            // 후: import file from './file'
            extensions: ['.js'],
            modules: ['node_modules']
        },
        devtool: 'source-map',
        devServer: {
            contentBase: './public'
        },
        optimization: {
            minimize: isEnvProduction,
            // Terser는 Uglify-js가 ES6+ 이상 서포트를 하지 않게되어 나온 JS Parser다.
            minimizer: [new TerserPlugin({}), new OptimizeCSSAssetsPlugin({})],
            // 목적: 업데이트 시 같은 파일명으로 배포 시 브라우저 캐싱으로 인해 업데이트가 이뤄지지 않는다.
            // 런타임은 웹팩 환경으로 파일들에서 import나 require 등이 문법에 상관 없이 __webpack_require__ 로 변환되는 등의 작업을 한다.
            runtimeChunk: 'single',
            // node_modules에서 import 한 파일들은 수정될 일이 거의 없으므로 따로 chunk하여 캐싱되게 한다.
            // 이렇게 구성되면 배포 시 src에 있는 파일 변동에만 hash를 적용하여 캐싱을 방지한다.
            // 다른 옵션들은 https://webpack.js.org/plugins/split-chunks-plugin/
            splitChunks: {
                chunks: 'all',
                automaticNameDelimiter: '.'
            }
        },
        // 리소스 파일 내에서 아래 확장자를 import하여 사용하기 위한 모듈이다.
        module: {
            rules: [
                // eslint-loader는 babel-loader보다 먼저 불러와야 한다.
                // https://webpack.js.org/loaders/eslint-loader
                {
                    enforce: 'pre',
                    test: /\.js$/,
                    exclude: /node_modules/,
                    loader: 'eslint-loader'
                },
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: [
                        isEnvProduction ? MiniCssExtractPlugin.loader : isEnvDevelopment && 'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: isEnvDevelopment
                            }
                        }
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
            isEnvProduction && new CleanWebpackPlugin(),
            new HtmlWebpackPlugin(
                Object.assign({},
                    {
                        template: paths.appHtml
                    }
                )
            ),
            // 네트워크 요청 보내기엔 너무 작은 용량이기 때문에 웹팩의 런타임 스크립트를 html에 inject 시킴.
            isEnvProduction && new InlineChunkHtmlPlugin(),
            isEnvProduction && new webpack.HashedModuleIdsPlugin(),
            // runtime.js는 네트워크 요청을 보내기엔 너무 작으므로 html에 인라인으로 삽입한다.
            // isEnvProduction && new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime~.+[.]js/]),
            isEnvProduction && new MiniCssExtractPlugin({
                filename: 'assets/css/[name].[contenthash:8].css',
                chunkFilename: 'assets/css/[name].[contenthash:8].chunk.css'
            }),
            new ManifestPlugin({
                fileName: 'asset-manifest.json',
                publicPath: '/'
            })
            // new NamedModulesPlugin() // 가독성 때문에 development 환경에서 유용하다.
        ].filter(Boolean)
    }
}