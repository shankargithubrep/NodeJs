'use strict';

const logger = require('./utils/logger');
const { start: startInventory } = require('./services/inventory-service');
const { start: startOrder } = require('./services/order-service');
const { start: startApi } = require('./services/api-gateway');

async function main() {
  const inventory = await startInventory();
  const inventoryAddress = process.env.INVENTORY_ADDRESS || `localhost:${inventory.port}`;

  const order = await startOrder({ inventoryAddress });
  const orderAddress = process.env.ORDER_ADDRESS || `localhost:${order.port}`;

  const api = await startApi({ orderAddress });

  const shutdown = async () => {
    logger.info('Shutting down services');
    await Promise.allSettled([
      api.stop && api.stop(),
      order.stop && order.stop(),
      inventory.stop && inventory.stop()
    ]);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('All services started. API available at http://localhost:%d', api.port);
}

if (require.main === module) {
  main().catch((err) => {
    logger.error({ err }, 'Failed to start services');
    process.exitCode = 1;
  });
}

module.exports = {
  main
};
