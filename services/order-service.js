'use strict';

const { grpc, retailProto } = require('../utils/grpc');
const logger = require('../utils/logger');
const initializeApm = require('../instrumentation/apm');

initializeApm('order-service');

const DEFAULT_PORT = process.env.ORDER_PORT || '50052';
const HOST = process.env.ORDER_HOST || '0.0.0.0';
const DEFAULT_INVENTORY_ADDRESS = process.env.INVENTORY_ADDRESS || 'localhost:50051';

function getInventoryDetails(client, sku) {
  return new Promise((resolve, reject) => {
    client.getItem({ sku }, (err, response) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(response);
    });
  });
}

async function createOrder(call, callback, inventoryClient) {
  try {
    const items = Array.isArray(call.request.items) ? call.request.items : [];

    if (items.length === 0) {
      callback(null, { lines: [], total: 0, currency: 'USD' });
      return;
    }

    const lines = [];
    let total = 0;

    for (const item of items) {
      const quantity = item.quantity || 0;

      if (!item.sku || quantity <= 0) {
        continue;
      }

      const details = await getInventoryDetails(inventoryClient, item.sku);
      const lineTotal = details.price * quantity;
      total += lineTotal;

      lines.push({
        sku: details.sku,
        name: details.name,
        quantity,
        price: details.price,
        line_total: lineTotal,
        currency: details.currency
      });
    }

    callback(null, {
      lines,
      total,
      currency: lines[0] ? lines[0].currency : 'USD'
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create order');
    callback(err);
  }
}

function start(options = {}) {
  const host = options.host || HOST;
  const port = String(options.port || DEFAULT_PORT);
  const inventoryAddress = options.inventoryAddress || DEFAULT_INVENTORY_ADDRESS;
  const server = new grpc.Server();

  const inventoryClient = new retailProto.InventoryService(
    inventoryAddress,
    grpc.credentials.createInsecure()
  );

  server.addService(retailProto.OrderService.service, {
    createOrder: (call, callback) => createOrder(call, callback, inventoryClient)
  });

  return new Promise((resolve, reject) => {
    server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) {
        reject(err);
        return;
      }

      logger.info({ host, port: boundPort, inventoryAddress }, 'Order service listening');
      resolve({
        server,
        port: boundPort,
        stop: () => {
          inventoryClient.close();
          return new Promise((stopResolve) => server.tryShutdown(stopResolve));
        }
      });
    });
  });
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err }, 'Order service failed to start');
    process.exitCode = 1;
  });
}

module.exports = {
  start
};
