const path = require('path')
const fs = require('fs')
const resolve = require('resolve')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const InlineChunkHtmlPlugin = require('inline-manifest-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const safePostCssParser = require('postcss-safe-parser')
const ManifestPlugin = require('webpack-manifest-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

const appDirectory = fs.realpathSync(process.cwd()) // 디렉토리 경로

const resolveApp = function(relativePath) {
    return path.resolve(appDirectory, relativePath)
}

const moduleFileExtensions = [
    'web.mjs',
    'mjs',
    'web.js',
    'js',
    'web.ts',
    'ts',
    'web.tsx',
    'tsx',
    'json',
    'web.jsx',
    'jsx',
]

const resolveModule = (resolveFn, filePath) => {
    const extension = moduleFileExtensions.find(extension =>
        fs.existsSync(resolveFn(`${filePath}.${extension}`))
    )

    if (extension) {
        return resolveFn(`${filePath}.${extension}`);
    }

    return resolveFn(`${filePath}.js`);
}

const paths = {
    appPath: resolveApp('src/index.ts'),
    appIndexJs: resolveModule(resolveApp, 'src/index'),
    appHtml: resolveApp('public/index.html'),
    buildPath: resolveApp('dist'),
    appSrc: resolveApp('src'),
    appNodeModules: resolveApp('node_modules'),
    appTsConfig: resolveApp('tsconfig.json'),
    appPublic: resolveApp('public')
}

module.exports = env => {
    const isEnvDevelopment = env.NODE_ENV === 'development'
    const isEnvProduction = env.NODE_ENV === 'production'

    return {
        mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
        entry: {
            app: paths.appIndexJs
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
            extensions: ['.js', '.ts'],
            modules: ['node_modules']
        },
        devtool: isEnvProduction ? 'source-map' : 'cheap-module-source-map',
        devServer: {
            contentBase: paths.appPublic,
            // 필요없는 웹팩 로그들 삭제해준다
            quiet: true,
            // 클라이언트 단 로그를 삭제해준다
            clientLogLevel: 'none'
        },
        optimization: {
            minimize: isEnvProduction,
            // Terser는 Uglify-js가 ES6+ 이상 서포트를 하지 않게되어 나온 JS Parser다.
            minimizer: [new TerserPlugin({}), new OptimizeCSSAssetsPlugin({
                cssProcessorOptions: {
                    parser: safePostCssParser
                }
            })],
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
                {
                    test: /\.js$/,
                    include: paths.appSrc,
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
                        },
                        {
                            loader: require.resolve('postcss-loader'),
                            options: {
                                // CSS import 시 필요.
                                // https://github.com/facebook/create-react-app/issues/2677
                                ident: 'postcss',
                                plugins: () => [
                                    require('postcss-flexbugs-fixes'),
                                    require('postcss-preset-env')({
                                        autoprefixer: {
                                            flexbox: 'no-2009'
                                        },
                                        stage: 3
                                    })
                                ]
                            }
                        }
                    ]
                },
                {
                    // oneOf 배열 내에 매칭되는 것에만 해당 모듈을 실행한다.
                    oneOf: [
                        {
                            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                            use: [
                                {
                                    loader: require.resolve('url-loader'),
                                    options: {
                                        // 10kb 미만은 url-loader로 처리
                                        limit: 10000,
                                        name: 'assets/media/[name].[hash:8].[ext]'
                                    }
                                }
                            ]
                        },
                        {
                            loader: require.resolve('file-loader'),
                            // js, html, json, css 파일 외의 형식 load
                            exclude: [/\.js$/, /\.html$/, /\.json$/, /\.css$/],
                            options: {
                                name: 'assets/media/[name].[hash:8].[ext]'
                            }
                        }
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
            isEnvProduction && new MiniCssExtractPlugin({
                filename: 'assets/css/[name].[contenthash:8].css',
                chunkFilename: 'assets/css/[name].[contenthash:8].chunk.css'
            }),
            new ManifestPlugin({
                fileName: 'asset-manifest.json',
                publicPath: '/'
            }),
            new ForkTsCheckerWebpackPlugin({
                typescript: resolve.sync('typescript', {
                    basedir: paths.appNodeModules,
                }),
                async: isEnvDevelopment,
                useTypescriptIncrementalApi: true,
                checkSyntacticErrors: true,
                tsconfig: paths.appTsConfig,
                reportFiles: [
                    '**',
                    '!**/*.json',
                    '!**/__tests__/**',
                    '!**/?(*.)(spec|test).*',
                    '!**/src/setupProxy.*',
                    '!**/src/setupTests.*',
                ],
                watch: paths.appSrc,
                silent: true,
                // The formatter is invoked directly in WebpackDevServerUtils during development
                formatter: isEnvProduction ? typescriptFormatter : undefined
            })
            // new NamedModulesPlugin() // 가독성 때문에 development 환경에서 유용하다.
        ].filter(Boolean)
    }
}