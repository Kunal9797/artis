const path = require('path');
const { override } = require('customize-cra');

module.exports = override(
  (config) => {
    // Enable full logging
    config.infrastructureLogging = {
      level: 'verbose',
      debug: /webpack/
    };

    // Add resolve logging
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
        use: {
          loader: 'ts-loader',
          options: {
            logLevel: 'info',
            logInfoToStdOut: true
          }
        }
      }
    ];

    return config;
  }
);