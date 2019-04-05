const path = require('path')
const fs = require('fs')
const resolve = require('resolve')
const webpack = require('webpack')
const PnpWebpackPlugin = require('pnp-webpack-plugin')
const ModuleScopePlugin = require('./ModuleScopePlugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const InlineChunkHtmlPlugin = require('inline-manifest-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const safePostCssParser = require('postcss-safe-parser')
const ManifestPlugin = require('webpack-manifest-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const FormatMessagesWebpackPlugin = require('format-messages-webpack-plugin')
const StringReplacePlugin = require('string-replace-webpack-plugin')
const ErrorOverlayPlugin = require('error-overlay-webpack-plugin')
const typescriptFormatter = require('./typescriptFormatter')

// 디렉토리 경로
const appDirectory = fs.realpathSync(process.cwd())

// 절대 경로
const resolveApp = function(relativePath) {
    return path.resolve(appDirectory, relativePath)
}

const moduleFileExtensions = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
]

const resolveModule = (resolveFn, filePath) => {
    const extension = moduleFileExtensions.find(extension =>
        fs.existsSync(resolveFn(`${filePath}.${extension}`))
    )

    if (extension) {
        return resolveFn(`${filePath}.${extension}`)
    }

    return resolveFn(`${filePath}.js`)
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

const useTypeScript = fs.existsSync(paths.appTsConfig);

module.exports = env => {
    const isEnvDevelopment = env.NODE_ENV === 'development'
    const isEnvProduction = env.NODE_ENV === 'production'

    return {
        mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
        entry: [
            // 이 보일러플레이트에선 appIndexJs는 src/index.tsx가 된다.
            paths.appIndexJs
        ],
        output: {
            // filename을 배포와 개발 모드로 분리하는 이유는 chunkhash가 개발 모드에서 컴파일 시간을 증가시키기 떄문.
            filename: isEnvProduction
                ? 'assets/js/[name].[chunkhash:8].js'
                : isEnvDevelopment && 'assets/js/bundle.js',
            // 코드 스플리팅을 사용한다면 vendor(라이브러리 코드), app(src에서 작성한 코드) 외에도 추가적인 청크 파일이 존재할 수 있음.
            chunkFilename: isEnvProduction
                ? 'assets/js/[name].[chunkhash:8].chunk.js'
                : isEnvDevelopment && 'assets/js/[name].chunk.js',
            // 배포 경로 지정
            path: isEnvProduction ? paths.buildPath : undefined,
            // 아웃풋에 /* filename */ 주석을 생성한다.
            pathinfo: isEnvDevelopment
        },
        devtool: isEnvProduction ? 'source-map' : 'cheap-module-source-map',
        devServer: {
            contentBase: paths.appPublic,
            // 필요없는 웹팩 로그들 삭제해준다
            quiet: true,
            overlay: false,
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
            // long term caching이 필요할 때 사용한다.
            // 런타임은 웹팩 환경으로 파일들에서 import나 require 등이 문법에 상관 없이 __webpack_require__ 로 변환되는 등의 작업을 한다.
            runtimeChunk: true,
            // 필요한 이유: 업데이트 시 같은 파일명으로 배포 시 브라우저 캐싱으로 인해 업데이트가 이뤄지지 않는다.
            // node_modules에서 import 한 파일들은 수정될 일이 거의 없으므로 따로 chunk하여 캐싱되게 한다.
            // 이렇게 구성되면 배포 시 src에 있는 파일 변동에만 hash를 적용하여 캐싱을 방지한다.
            // 다른 옵션들은 https://webpack.js.org/plugins/split-chunks-plugin/
            splitChunks: {
                chunks: 'all',
                automaticNameDelimiter: '.'
            }
        },
        resolve: {
            // extensions 추가 전/후
            // 전: import file from './file.js'
            // 후: import file from './file'
            extensions: moduleFileExtensions
                .map(ext => `.${ext}`)
                .filter(ext => useTypeScript || !ext.includes('ts')),
            modules: [paths.appNodeModules, paths.appSrc],
            plugins: [
                PnpWebpackPlugin,
                // src 또는 node_modules 외의 폴더에서 import 하는 것을 방지한다.
                // babel을 통해 src 폴더 내 파일만 처리하므로 src 밖 소스를 import
                // 하면 컴파일이 되지 않은 파일이 생길 수 있다.
                new ModuleScopePlugin(paths.appSrc)
            ]
        },
        resolveLoader: {
            plugins: [
                PnpWebpackPlugin.moduleLoader(module)
            ]
        },
        // 리소스 파일 내에서 아래 확장자를 import하여 사용하기 위한 모듈이다.
        module: {
            rules: [
                {
                    // 이벤트 관리자 내 사용 중인 react-beautiful-dnd 피어 디펜던시는 react-redux 5.0.0 버전 대인데
                    // 설치된 react-redux는 v6이여서 충돌이 발생한다.
                    test: /react-beautiful-dnd.esm.js$/,
                    loader: StringReplacePlugin.replace({replacements: [
                        // react-beautiful-dnd 자체 경로의 react-redux를 사용하게 한다.
                        {
                            pattern: /from 'react-redux';/g,
                            replacement: (match, offset, str)=>"from '../node_modules/react-redux';",
                        },
                    ]}),
                },
                {
                    // oneOf 배열 내에 매칭되는 것에만 해당 모듈을 실행한다.
                    oneOf: [
                        {
                            // url-loader는 file-loader처럼 동작하지만 10kb 미만인 파일은 url로 삽입하여 네트워크 request 비용을 줄인다.
                            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
                            use: [
                                {
                                    loader: require.resolve('url-loader'),
                                    options: {
                                        // 10kb 미만은 url-loader로 처리
                                        // 10kb 미만의 해당 파일은 base64로 인코딩된 url로 삽입되는 것을 소스로 확인할 수 있다.
                                        limit: 10000,
                                        name: 'assets/media/[name].[hash:8].[ext]'
                                    }
                                }
                            ]
                        },
                        {
                            test: /\.(js|jsx|ts|tsx)$/,
                            include: paths.appSrc,
                            loader: require.resolve('babel-loader'),
                            options: {
                                customize: require.resolve(
                                    'babel-preset-react-app/webpack-overrides'
                                ),
                                cacheDirectory: true,
                                cacheCompression: isEnvProduction,
                                compact: isEnvProduction,
                            }
                        },
                        {
                            test: /\.css$/,
                            use: [
                                isEnvProduction ? MiniCssExtractPlugin.loader : isEnvDevelopment && 'style-loader',
                                {
                                    loader: 'css-loader',
                                    options: {
                                        importLoaders: 1,
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
                            loader: require.resolve('file-loader'),
                            // js, html, json, css 파일 외의 형식 load
                            exclude: [/\.(js|jsx|ts|tsx)$/, /\.html$/, /\.json$/, /\.css$/],
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
                        inject: true,
                        template: paths.appHtml
                    }
                )
            ),
            // 네트워크 요청 보내기엔 너무 작은 용량이기 때문에 웹팩의 런타임 스크립트를 html에 inject 시킴.
            isEnvProduction && new InlineChunkHtmlPlugin(),
            // 배포 시 캐싱된 파일들이 빌드 순서가 뒤죽박죽 되서 제대로 캐싱이 안되는데 이는 모듈 별 아이디가 없어서 그러므로
            // 해쉬 모듈 아이디를 부여한다.
            isEnvProduction && new webpack.HashedModuleIdsPlugin(),
            isEnvProduction && new MiniCssExtractPlugin({
                filename: 'assets/css/[name].[contenthash:8].css',
                chunkFilename: 'assets/css/[name].[contenthash:8].chunk.css'
            }),
            new ManifestPlugin({
                fileName: 'asset-manifest.json',
                publicPath: '/'
            }),
            isEnvDevelopment && new FormatMessagesWebpackPlugin({ notification: false }),
            isEnvDevelopment && new ErrorOverlayPlugin(),
            // ForkTsCheckerWebpackPlugin은 FormatMessage, ErrorOverlay 보다 밑에 있어야함.
            new ForkTsCheckerWebpackPlugin({
                typescript: resolve.sync('typescript', {
                    basedir: paths.appNodeModules
                }),
                async: isEnvDevelopment,
                useTypescriptIncrementalApi: true,
                checkSyntacticErrors: true,
                tsconfig: paths.appTsConfig,
                reportFiles: [
                    '**',
                    '!**/*.json',
                    '!**/__tests__/**'
                ],
                watch: paths.appSrc,
                // The formatter is invoked directly in WebpackDevServerUtils during development
                formatter: typescriptFormatter
            })
            // new NamedModulesPlugin() // 가독성 때문에 development 환경에서 유용하다.
        ].filter(Boolean)
    }
}