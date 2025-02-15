const { override } = require('customize-cra');

module.exports = override((config) => {
  // Disable optimization temporarily
  config.optimization = {
    minimize: false,
    splitChunks: false,
  };
  
  // Add more logging
  config.stats = 'verbose';
  
  return config;
});