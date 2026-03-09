const MergeIntoSingleFilePlugin = require('webpack-merge-and-include-globally');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const LodashWebpackPlugin = require('lodash-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const postcssPresetEnv = require('postcss-preset-env');
const autoprefixer = require('autoprefixer');
const postcssCssnano = require('cssnano');
const UglifyJS = require('uglify-js');


const hostFiles = [
    __dirname + '/app_src/lib/jam/jamActions.jsxinc',
    __dirname + '/app_src/lib/jam/jamEngine.jsxinc',
    __dirname + '/app_src/lib/jam/jamHelpers.jsxinc',
    __dirname + '/app_src/lib/jam/jamJSON.jsxinc',
    __dirname + '/app_src/lib/jam/jamText.jsxinc',
    __dirname + '/app_src/lib/jam/jamStyles.jsxinc',
    __dirname + '/app_src/lib/jam/jamUtils.jsxinc',
    __dirname + '/app_src/host.js'
];


const defaultConfig = {
    entry: {
        index: ['./app_src/index.jsx']
    },
    output: {
        path: __dirname + '/app/',
        filename: 'index.js',
        publicPath: './'
    },
    performance: {
        hints: false
    },
    resolve: {
        extensions: ['.js', '.jsx', '.jsxinc']
    },
    externals: [
        function({ request }, callback) {
            const nodeModules = ['fs', 'path', 'os', 'child_process', 'https', 'http', 'crypto'];
            if (nodeModules.includes(request)) {
                const safeExpr =
                    "(function(){" +
                    "var r=typeof require==='function'?require:" +
                    "typeof cep_node!=='undefined'&&cep_node.require?cep_node.require:" +
                    "typeof process!=='undefined'&&process.mainModule&&process.mainModule.require?process.mainModule.require:" +
                    "null;" +
                    "if(!r)throw new Error('Node.js require not available. Update Photoshop or reinstall TypeR with --enable-nodejs in manifest.');" +
                    "return r('" + request + "');" +
                    "})()";
                return callback(null, 'var ' + safeExpr);
            }
            callback();
        }
    ]
};

const devConfig = {
    mode: 'development',
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        plugins: ['lodash']
                    }
                }
            }, {
                test: /\.css$/,
                use: {
                    loader: 'file-loader'
                }
            }, {
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    }, {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true
                        }
                    }, {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: true,
                            postcssOptions: {
                                plugins: [
                                    postcssPresetEnv({ features: { 'custom-properties': false } }),
                                    autoprefixer()
                                ]
                            }
                        }
                    }, {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true,
                            sassOptions: {
                                quietDeps: true
                            }
                        }
                    }
                ]
            }, {
                test: /\.(gif|png|jpe?g|svg)$/,
                loader: 'file-loader'
            }, {
                test: /\.(woff|woff2|eot|otf|ttf)?$/,
                loader: 'base64-inline-loader'
            }
        ]
    },
    plugins: [
        new LodashWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './app_src/index.html',
            filename: 'index.html'
        }),
        new MiniCssExtractPlugin(),
        new MergeIntoSingleFilePlugin({
            files: {
                'host.jsx': hostFiles
            }
        })
    ]
};

const prodConfig = {
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        plugins: ['lodash']
                    }
                }
            }, {
                test: /\.css$/,
                use: {
                    loader: 'file-loader'
                }
            }, {
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    }, {
                        loader: 'css-loader'
                    }, {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    postcssPresetEnv({ features: { 'custom-properties': false } }),
                                    postcssCssnano(),
                                    autoprefixer()
                                ]
                            }
                        }
                    }, {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                quietDeps: true
                            }
                        }
                    }
                ]
            }, {
                test: /\.(gif|png|jpe?g|svg)$/,
                loader: 'file-loader'
            }, {
                test: /\.(woff|woff2|eot|otf|ttf)?$/,
                loader: 'base64-inline-loader'
            }
        ]
    },
    plugins: [
        new LodashWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './app_src/index.html',
            filename: 'index.html',
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeAttributeQuotes: true,
                removeEmptyAttributes: true,
                collapseBooleanAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true
            }
        }),
        new MiniCssExtractPlugin(),
        new MergeIntoSingleFilePlugin({
            files: {
                'host.jsx': hostFiles
            },
            transform: {
                'host.jsx': code => {
                    const res = UglifyJS.minify(code, {compress: false, output: {beautify: true, indent_level: 0, quote_keys: true}});
                    return res.code.replace(/([{};:,])\s*\n+\s*/gi, '$1').replace(/\s*\n+\s*([})\];:,])/gi, '$1');
                }
            }
        })
    ]
};

function clientConfig(env, argv) {
    const envConfig = (argv.mode === 'development') ? devConfig : prodConfig;
    return Object.assign({}, defaultConfig, envConfig);
}

module.exports = [clientConfig];