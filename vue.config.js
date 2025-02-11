const { defineConfig } = require("@vue/cli-service");
const path = require("path");
const KUZUDB_WASM_DIST = path.dirname(require.resolve("kuzu-wasm"));
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = defineConfig({
  devServer: {
    historyApiFallback: false,
  },
  transpileDependencies: true,
  pages: {
    index: {
      entry: "src/main.js",
      title: "Kùzu WebAssembly Demo App",
    },
  },
  css: {
    loaderOptions: {
      sass: {
        // Globally load bootstrap variables and functions
        additionalData: `
          @import "~/node_modules/bootstrap/scss/_functions.scss";
          @import "~/node_modules/bootstrap/scss/_variables.scss";
          `,
      },
    },
  },
  configureWebpack: {
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: KUZUDB_WASM_DIST,
            to: "js",
          },
        ],
        options: {
          concurrency: 100,
        },
      }),
    ],
  }
});
