'use strict';

/**
 * Initializes Elastic APM when configuration is available.
 * Each service can import and call this helper with its service name.
 */
module.exports = function initializeApm(serviceName) {
  if (!process.env.ELASTIC_APM_SERVER_URL) {
    return null;
  }

  const apm = require('elastic-apm-node');

  if (!apm.isStarted()) {
    apm.start({
      serviceName: serviceName || process.env.ELASTIC_APM_SERVICE_NAME || 'grpc-demo-service',
      captureBody: 'all',
      centralConfig: false,
      logLevel: process.env.ELASTIC_APM_LOG_LEVEL || 'warn'
    });
  }

  return apm;
};
