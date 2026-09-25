import { Router } from 'express';

import { openApiDocument } from './openapi.document.js';

function swaggerHtml(specificationUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Interactive documentation for the Nexora Workspace API." />
    <title>Nexora Workspace API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: ${JSON.stringify(specificationUrl)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: true,
        tryItOutEnabled: true
      });
    </script>
  </body>
</html>`;
}

export function createOpenApiRouter(apiPrefix: string): Router {
  const router = Router();

  router.get('/openapi.json', (_request, response) => {
    response.status(200).json(openApiDocument);
  });

  router.get(['/docs', '/docs/'], (_request, response) => {
    response
      .status(200)
      .type('html')
      .send(swaggerHtml(`${apiPrefix.replace(/\/+$/, '')}/openapi.json`));
  });

  return router;
}
