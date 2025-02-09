const { override } = require('customize-cra');

module.exports = override(
  (config) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
      },
    };
    return config;
  }
);