import { generateOpenApiDocument } from 'trpc-to-openapi';
import { appRouter } from './routers/_app';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Example CRUD API',
  description: 'OpenAPI compliant REST API built using tRPC with Next.js',
  version: '1.0.0',
  baseUrl: 'http://localhost:3000/api',
  tags: ['auth', 'users', 'posts'],
});
