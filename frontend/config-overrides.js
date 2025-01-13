const { override } = require('customize-cra');

module.exports = override(
  (config) => {
    config.module.rules.push({
      test: /\.geojson$/,
      loader: 'json-loader',
      type: 'javascript/auto'
    });
    return config;
  }
);