'use strict';

const assert = require('assert');

const { grpc, retailProto } = require('../utils/grpc');
const { start: startInventory } = require('../services/inventory-service');
const { start: startOrder } = require('../services/order-service');

function closeGrpcServer(server) {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve) => server.tryShutdown(resolve));
}

describe('gRPC services', function () {
  this.timeout(10000);

  let inventoryServer;
  let orderServer;
  let inventoryPort;
  let orderPort;
  let orderClient;

  before(async () => {
    const inventory = await startInventory({ port: 0 });
    inventoryServer = inventory.server;
    inventoryPort = inventory.port;

    const order = await startOrder({ port: 0, inventoryAddress: `localhost:${inventoryPort}` });
    orderServer = order.server;
    orderPort = order.port;

    orderClient = new retailProto.OrderService(`localhost:${orderPort}`, grpc.credentials.createInsecure());
  });

  after(async () => {
    if (orderClient) {
      orderClient.close();
    }

    await Promise.all([
      closeGrpcServer(orderServer),
      closeGrpcServer(inventoryServer)
    ]);
  });

  it('aggregates inventory data when creating orders', (done) => {
    const request = {
      items: [
        { sku: 'coffee-beans', quantity: 2 },
        { sku: 'ceramic-mug', quantity: 1 }
      ]
    };

    orderClient.createOrder(request, (err, response) => {
      if (err) {
        done(err);
        return;
      }

      assert.strictEqual(response.lines.length, 2);
      assert.strictEqual(response.lines[0].sku, 'coffee-beans');
      assert.strictEqual(response.lines[0].quantity, 2);
      assert.ok(response.total > 0);
      done();
    });
  });

  it('propagates not found errors from the inventory service', (done) => {
    orderClient.createOrder({ items: [{ sku: 'unknown-sku', quantity: 1 }] }, (err) => {
      assert(err);
      assert.strictEqual(err.code, grpc.status.NOT_FOUND);
      done();
    });
  });
});
