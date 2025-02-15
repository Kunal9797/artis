const path = require('path');
const { override, addWebpackAlias } = require('customize-cra');

module.exports = override(
  (config) => {
    // Disable optimization temporarily
    config.optimization = {
      minimize: false,
      splitChunks: false,
    };
    
    // Add more logging
    config.stats = 'verbose';

    // Explicitly exclude backend directory
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

    // Log resolved modules
    console.log('Webpack resolve paths:', JSON.stringify(config.resolve.modules, null, 2));
    console.log('Webpack entry points:', JSON.stringify(config.entry, null, 2));
    
    return config;
  }
);