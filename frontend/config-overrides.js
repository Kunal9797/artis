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

    // Add debug logging for each file being processed
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      enforce: 'pre',
      use: [
        {
          loader: 'ts-loader',
          options: {
            getCustomTransformers: () => ({
              before: [
                {
                  transform: (context) => {
                    const { fileName } = context;
                    console.log('Processing file:', fileName);
                    return context;
                  },
                },
              ],
            }),
          },
        },
      ],
    });

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
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      exclude: [
        /node_modules/,
        /\.(test|spec)\.(ts|tsx)$/,
        /jest\.config\.ts$/,
        /setupTests\.ts$/,
        path.resolve(__dirname, '../backend'),
        path.resolve(__dirname, '../tools'),
        path.resolve(__dirname, 'scripts')
      ]
    });

    // Log resolved modules
    console.log('Webpack resolve paths:', JSON.stringify(config.resolve.modules, null, 2));
    console.log('Webpack entry points:', JSON.stringify(config.entry, null, 2));
    
    return config;
  }
);