# Distributed gRPC demo with Elastic observability hooks

This repository now contains a lightweight microservices demo that you can use to showcase how Elastic Observability can monitor a distributed Node.js application.  
Three processes collaborate through gRPC:

1. **Inventory service** – exposes product metadata through gRPC.
2. **Order service** – receives order requests over gRPC and enriches them with inventory data by calling the inventory service.
3. **API gateway** – offers an HTTP interface for end users and translates calls into gRPC invocations to the order service.

Each service is instrumented with the Elastic APM Node.js agent (disabled unless the required environment variables are provided) and emits structured logs so that you can connect the stack to Elastic easily.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start all services from a single terminal:

   ```bash
   npm start
   ```

   You can also run the processes individually if you prefer to launch them under separate process managers:

   ```bash
   npm run start:inventory
   npm run start:order
   npm run start:api
   ```

3. Create an order through the HTTP gateway:

   ```bash
   curl -X POST http://localhost:3000/orders \
     -H 'Content-Type: application/json' \
     -d '{"items":[{"sku":"coffee-beans","quantity":2},{"sku":"ceramic-mug","quantity":1}]}'
   ```

   The gateway will respond with the calculated order total. Behind the scenes the order service queries the inventory service over gRPC for each item.

## Enabling Elastic Observability

Elastic APM support is optional and only activates when the relevant environment variables are set. Before starting any service set:

```bash
export ELASTIC_APM_SERVER_URL="https://<your-apm-endpoint>:8200"
export ELASTIC_APM_SECRET_TOKEN="<apm-secret-token>"
# Each process can override the service name if you want them to appear separately in Elastic
export ELASTIC_APM_SERVICE_NAME="grpc-retail-demo"
```

You can provide distinct service names by exporting `ELASTIC_APM_SERVICE_NAME` in each terminal before launching the respective process (for example `grpc-retail-inventory`, `grpc-retail-order`, and `grpc-retail-api`).

Once the services are running, metrics, traces, and transaction data will be sent automatically to Elastic APM, allowing you to demonstrate distributed tracing across gRPC boundaries.

## Running tests

The repository includes Mocha-based integration tests that exercise the gRPC services together:

```bash
npm test
```

## Original documentation

For information on how to set up a pipeline for this repository, see [Create your first pipeline](https://docs.microsoft.com/azure/devops/pipelines/get-started-yaml?view=azure-devops).
For more information on building JavaScript or NodeJS applications, see [JavaScript](https://docs.microsoft.com/azure/devops/pipelines/languages/javascript).

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# Legal Notices

Microsoft and any contributors grant you a license to the Microsoft documentation and other content
in this repository under the [Creative Commons Attribution 4.0 International Public License](https://creativecommons.org/licenses/by/4.0/legalcode),
see the [LICENSE](LICENSE) file, and grant you a license to any code in the repository under the [MIT License](https://opensource.org/licenses/MIT), see the
[LICENSE-CODE](LICENSE-CODE) file.

Microsoft, Windows, Microsoft Azure and/or other Microsoft products and services referenced in the documentation
may be either trademarks or registered trademarks of Microsoft in the United States and/or other countries.
The licenses for this project do not grant you rights to use any Microsoft names, logos, or trademarks.
Microsoft's general trademark guidelines can be found at http://go.microsoft.com/fwlink/?LinkID=254653.

Privacy information can be found at https://privacy.microsoft.com/en-us/

Microsoft and any contributors reserve all others rights, whether under their respective copyrights, patents,
or trademarks, whether by implication, estoppel or otherwise.
