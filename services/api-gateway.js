'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const { grpc, retailProto } = require('../utils/grpc');
const logger = require('../utils/logger');
const initializeApm = require('../instrumentation/apm');

initializeApm('api-gateway');

const DEFAULT_PORT = process.env.API_PORT || 3000;
const DEFAULT_ORDER_ADDRESS = process.env.ORDER_ADDRESS || 'localhost:50052';

function createApp(orderAddress = DEFAULT_ORDER_ADDRESS) {
  const app = express();
  const orderClient = new retailProto.OrderService(orderAddress, grpc.credentials.createInsecure());

  app.use(bodyParser.json());

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/orders', (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    orderClient.createOrder({ items }, (err, response) => {
      if (err) {
        logger.error({ err }, 'Order creation failed');

        if (err.code === grpc.status.NOT_FOUND) {
          res.status(404).json({ message: err.message });
          return;
        }

        res.status(502).json({ message: 'Upstream error creating order' });
        return;
      }

      res.json(response);
    });
  });

  return app;
}

function start(options = {}) {
  const port = options.port || DEFAULT_PORT;
  const orderAddress = options.orderAddress || DEFAULT_ORDER_ADDRESS;
  const app = createApp(orderAddress);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info({ port, orderAddress }, 'API gateway listening');
      resolve({
        app,
        server,
        port,
        stop: () => new Promise((stopResolve) => server.close(stopResolve))
      });
    });

    server.on('error', reject);
  });
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err }, 'API gateway failed to start');
    process.exitCode = 1;
  });
}

module.exports = {
  start,
  createApp
};
