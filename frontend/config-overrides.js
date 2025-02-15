const path = require('path');
const { override } = require('customize-cra');

module.exports = override(
  (config) => {
    // Disable optimization temporarily
    config.optimization = {
      minimize: false,
      splitChunks: false,
    };
    
    // Add more logging
    config.stats = 'verbose';

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
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            onlyCompileBundledFiles: true,
            configFile: path.resolve(__dirname, 'tsconfig.json'),
            getCustomTransformers: () => ({
              before: [{
                transform: (sourceFile) => {
                  console.log('Processing:', sourceFile.fileName);
                  return sourceFile;
                }
              }]
            })
          }
        }
      }
    ];

    // Log configuration
    console.log('Webpack resolve paths:', JSON.stringify(config.resolve.modules, null, 2));
    console.log('Webpack entry points:', JSON.stringify(config.entry, null, 2));

    return config;
  }
);