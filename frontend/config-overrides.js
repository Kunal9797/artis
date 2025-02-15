const path = require('path');
const { override } = require('customize-cra');
const webpack = require('webpack');

module.exports = override(
  (config) => {
    // Add resolve plugin to trace module resolution
    config.plugins = [
      ...config.plugins,
      new webpack.ResolverPlugin({
        plugins: [
          function() {
            this.plugin('resolve', function(context, callback) {
              console.log('Resolving:', context.request);
              callback();
            });
          }
        ]
      })
    ];

    // Explicitly exclude problematic paths
    config.resolve = {
      ...config.resolve,
      modules: [
        'node_modules',
        path.resolve(__dirname, 'src')
      ],
      alias: {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
      }
    };

    // Add explicit file exclusions
    config.module.rules = [
      ...config.module.rules,
      {
        test: /\.(ts|tsx)$/,
        exclude: [
          /node_modules/,
          /\.(test|spec)\.(ts|tsx)$/,
          /jest\.config\.ts$/,
          /setupTests\.ts$/,
          path.resolve(__dirname, '../backend'),
          path.resolve(__dirname, '../tools'),
          path.resolve(__dirname, 'scripts')
        ],
        use: 'ts-loader'
      }
    ];

    return config;
  }
);