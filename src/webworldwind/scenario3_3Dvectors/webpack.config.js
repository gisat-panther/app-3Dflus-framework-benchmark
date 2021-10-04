const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [{
    mode: 'development',
    context: __dirname,
    entry: {
        app: './src/index.js'
    },
    output: {
        filename: '[name].js',
        path: path.resolve("../../../dist/webworldwind", 'scenario3_3Dvectors')
    },
    devtool: 'eval',
    node: {
        // Resolve node module use of fs
        fs: "empty",
        Buffer: false,
        http: "empty",
        https: "empty",
        zlib: "empty"
    },
    resolve: {
        mainFields: ['module', 'main']
    },
    module: {
        unknownContextCritical: false,
        rules: [{
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }, {
            test: /\.(png|gif|jpg|jpeg|svg|xml|json)$/,
            use: ['url-loader']
        }]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            inject : true
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'node_modules/webworldwind-esa/build/dist/images', to: 'images' },
            ],
        }),
        // new webpack.DefinePlugin({
        //     // Define relative base path in cesium for loading assets
        //     CESIUM_BASE_URL: JSON.stringify('')
        // })
    ],

    // development server options
    devServer: {
        contentBase: path.join(__dirname, "dist")
    }
}];