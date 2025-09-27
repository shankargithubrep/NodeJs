'use strict';

const { grpc, retailProto } = require('../utils/grpc');
const logger = require('../utils/logger');
const initializeApm = require('../instrumentation/apm');

initializeApm('inventory-service');

const DEFAULT_PORT = process.env.INVENTORY_PORT || '50051';
const HOST = process.env.INVENTORY_HOST || '0.0.0.0';

const inventory = new Map([
  ['coffee-beans', { sku: 'coffee-beans', name: 'Single Origin Coffee Beans', price: 12.5, currency: 'USD' }],
  ['espresso-machine', { sku: 'espresso-machine', name: 'Home Espresso Machine', price: 249.99, currency: 'USD' }],
  ['ceramic-mug', { sku: 'ceramic-mug', name: 'Ceramic Mug', price: 9.75, currency: 'USD' }]
]);

function getItem(call, callback) {
  const sku = call.request.sku;
  const item = inventory.get(sku);

  if (!item) {
    logger.warn({ sku }, 'Inventory lookup failed');
    callback({
      code: grpc.status.NOT_FOUND,
      message: `Item with SKU "${sku}" was not found`
    });
    return;
  }

  logger.debug({ sku }, 'Inventory lookup succeeded');
  callback(null, item);
}

function start(options = {}) {
  const host = options.host || HOST;
  const port = String(options.port || DEFAULT_PORT);
  const server = new grpc.Server();

  server.addService(retailProto.InventoryService.service, {
    getItem
  });

  return new Promise((resolve, reject) => {
    server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) {
        reject(err);
        return;
      }

      logger.info({ host, port: boundPort }, 'Inventory service listening');
      resolve({
        server,
        port: boundPort,
        stop: () => new Promise((stopResolve) => server.tryShutdown(stopResolve))
      });
    });
  });
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err }, 'Inventory service failed to start');
    process.exitCode = 1;
  });
}

module.exports = {
  start
};
