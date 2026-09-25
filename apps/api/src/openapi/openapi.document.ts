type OpenApiObject = Record<string, unknown>;

const reference = (name: string): OpenApiObject => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name: string): OpenApiObject => ({ type: 'array', items: reference(name) });
const bearerSecurity = [{ bearerAuth: [] }];

const pathId = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Resource UUID.',
  schema: { type: 'string', format: 'uuid' },
};

const query = (name: string, schema: OpenApiObject, description?: string): OpenApiObject => ({
  name,
  in: 'query',
  required: false,
  ...(description ? { description } : {}),
  schema,
});

const paginationParameters = [
  query('page', { type: 'integer', minimum: 1, default: 1 }),
  query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }),
];
const dateRangeParameters = [
  query('from', { type: 'string', format: 'date' }),
  query('to', { type: 'string', format: 'date' }),
];

const jsonContent = (schema: OpenApiObject): OpenApiObject => ({
  'application/json': { schema },
});

const requestBody = (schema: OpenApiObject): OpenApiObject => ({
  required: true,
  content: jsonContent(schema),
});

const response = (description: string, schema?: OpenApiObject): OpenApiObject => ({
  description,
  ...(schema ? { content: jsonContent(schema) } : {}),
});

const dataEnvelope = (schema: OpenApiObject): OpenApiObject => ({
  type: 'object',
  required: ['data'],
  properties: { data: schema },
});

const pageEnvelope = (schemaName: string): OpenApiObject => ({
  type: 'object',
  required: ['data', 'meta'],
  properties: {
    data: arrayOf(schemaName),
    meta: reference('PaginationMeta'),
  },
});

interface OperationOptions {
  security?: boolean;
  parameters?: OpenApiObject[];
  body?: OpenApiObject;
  successStatus?: '200' | '201' | '202' | '204';
  successDescription?: string;
  successSchema?: OpenApiObject;
}

function operation(tag: string, summary: string, options: OperationOptions = {}): OpenApiObject {
  const status = options.successStatus ?? '200';
  return {
    tags: [tag],
    summary,
    operationId: `${tag.toLowerCase().replaceAll(' ', '')}${summary
      .replaceAll(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
      .join('')}`,
    ...(options.security === false ? {} : { security: bearerSecurity }),
    ...(options.parameters ? { parameters: options.parameters } : {}),
    ...(options.body ? { requestBody: requestBody(options.body) } : {}),
    responses: {
      [status]: response(
        options.successDescription ?? 'Successful response.',
        options.successSchema,
      ),
      ...(options.security === false
        ? {}
        : { '401': { $ref: '#/components/responses/Unauthorized' } }),
      '422': { $ref: '#/components/responses/ValidationError' },
    },
  };
}

const schemas: Record<string, OpenApiObject> = {
  Error: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string' },
          details: {},
        },
      },
    },
  },
  PaginationMeta: {
    type: 'object',
    required: ['page', 'limit', 'total', 'totalPages'],
    properties: {
      page: { type: 'integer' },
      limit: { type: 'integer' },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
    },
  },
  RegisterInput: {
    type: 'object',
    required: ['fullName', 'email', 'username', 'password'],
    additionalProperties: false,
    properties: {
      fullName: { type: 'string', minLength: 3, maxLength: 120 },
      email: { type: 'string', format: 'email' },
      username: { type: 'string', minLength: 3, maxLength: 50 },
      password: { type: 'string', format: 'password', minLength: 8, maxLength: 72 },
    },
  },
  LoginInput: {
    type: 'object',
    required: ['email', 'password'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' },
    },
  },
  RefreshTokenInput: {
    type: 'object',
    required: ['refreshToken'],
    additionalProperties: false,
    properties: { refreshToken: { type: 'string', minLength: 32, maxLength: 256 } },
  },
  AuthSession: {
    type: 'object',
    properties: {
      user: reference('RegisteredUser'),
      workspace: reference('Workspace'),
      tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'integer' },
          refreshExpiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  RegisteredUser: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      username: { type: 'string' },
      fullName: { type: 'string' },
      displayName: { type: ['string', 'null'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Workspace: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
    },
  },
  RegisteredAccount: {
    type: 'object',
    properties: { user: reference('RegisteredUser'), workspace: reference('Workspace') },
  },
  UserProfile: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      fullName: { type: 'string' },
      displayName: { type: ['string', 'null'] },
      email: { type: 'string', format: 'email', readOnly: true },
      username: { type: 'string', readOnly: true },
      phone: { type: ['string', 'null'] },
      birthDate: { type: ['string', 'null'], format: 'date' },
      bio: { type: ['string', 'null'] },
      taxId: { type: ['string', 'null'], description: 'Can only be assigned once.' },
      avatarUrl: { type: ['string', 'null'], format: 'uri' },
      preferences: {
        type: 'object',
        properties: {
          language: { type: 'string' },
          timezone: { type: 'string' },
          dateFormat: { type: 'string' },
          currency: { type: 'string', minLength: 3, maxLength: 3 },
          compactSidebar: { type: 'boolean' },
          notifications: {
            type: 'object',
            properties: {
              tasks: { type: 'boolean' },
              invoices: { type: 'boolean' },
              events: { type: 'boolean' },
              customers: { type: 'boolean' },
            },
          },
        },
      },
      workspace: reference('Workspace'),
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  UpdateProfileInput: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      fullName: { type: 'string', minLength: 2, maxLength: 120 },
      displayName: { type: ['string', 'null'], maxLength: 80 },
      phone: { type: ['string', 'null'], maxLength: 30 },
      birthDate: { type: ['string', 'null'], format: 'date' },
      bio: { type: ['string', 'null'], maxLength: 500 },
      taxId: { type: 'string', description: 'CPF or CNPJ containing 11 or 14 digits.' },
      avatarUrl: { type: ['string', 'null'], format: 'uri' },
      language: { type: 'string' },
      timezone: { type: 'string' },
      dateFormat: { type: 'string' },
      currency: { type: 'string', minLength: 3, maxLength: 3 },
      compactSidebar: { type: 'boolean' },
      taskNotifications: { type: 'boolean' },
      invoiceNotifications: { type: 'boolean' },
      eventNotifications: { type: 'boolean' },
      customerNotifications: { type: 'boolean' },
    },
  },
  CustomerInput: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'phone', 'gender', 'role', 'address'],
    additionalProperties: false,
    properties: {
      firstName: { type: 'string', maxLength: 80 },
      lastName: { type: 'string', maxLength: 80 },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string', maxLength: 30 },
      gender: { type: 'string', enum: ['male', 'female', 'non-binary'] },
      role: { type: 'string', maxLength: 100 },
      address: { type: 'string', maxLength: 300 },
    },
  },
  Customer: {
    allOf: [
      reference('CustomerInput'),
      {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          performance: { type: 'array', items: { type: 'integer' } },
          satisfaction: { type: 'integer' },
          retention: { type: 'integer' },
          color: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  UpdateCustomerInput: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      firstName: { type: 'string', maxLength: 80 },
      lastName: { type: 'string', maxLength: 80 },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string', maxLength: 30 },
      gender: { type: 'string', enum: ['male', 'female', 'non-binary'] },
      role: { type: 'string', maxLength: 100 },
      address: { type: 'string', maxLength: 300 },
    },
  },
  ProductInput: {
    type: 'object',
    required: ['name', 'brand', 'category', 'description', 'price'],
    additionalProperties: false,
    properties: {
      sku: { type: ['string', 'null'], maxLength: 80 },
      name: { type: 'string', maxLength: 160 },
      brand: { type: 'string', maxLength: 100 },
      category: { type: 'string', maxLength: 100 },
      description: { type: ['string', 'null'], maxLength: 1000 },
      price: { type: 'number', format: 'double', minimum: 0 },
      negotiable: { type: 'boolean', default: false },
      stock: { type: 'integer', minimum: 0, default: 0 },
      active: { type: 'boolean', default: true },
    },
  },
  Product: {
    allOf: [
      reference('ProductInput'),
      {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  UpdateProductInput: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      sku: { type: ['string', 'null'], maxLength: 80 },
      name: { type: 'string', maxLength: 160 },
      brand: { type: 'string', maxLength: 100 },
      category: { type: 'string', maxLength: 100 },
      description: { type: ['string', 'null'], maxLength: 1000 },
      price: { type: 'number', minimum: 0 },
      negotiable: { type: 'boolean' },
      stock: { type: 'integer', minimum: 0 },
      active: { type: 'boolean' },
    },
  },
  InvoiceLineInput: {
    type: 'object',
    required: ['description', 'rate', 'quantity'],
    properties: {
      productId: { type: ['string', 'null'], format: 'uuid' },
      description: { type: 'string', maxLength: 300 },
      rate: { type: 'number', minimum: 0 },
      quantity: { type: 'integer', minimum: 1 },
    },
  },
  InvoiceInput: {
    type: 'object',
    required: ['customerName', 'email', 'issuedAt', 'items'],
    additionalProperties: false,
    properties: {
      customerId: { type: ['string', 'null'], format: 'uuid' },
      customerName: { type: 'string', maxLength: 160 },
      email: { type: 'string', format: 'email' },
      address: { type: ['string', 'null'], maxLength: 300 },
      issuedAt: { type: 'string', format: 'date-time' },
      dueAt: { type: ['string', 'null'], format: 'date-time' },
      currency: { type: 'string', default: 'USD' },
      discount: { type: 'number', minimum: 0, maximum: 100, default: 0 },
      items: { type: 'array', minItems: 1, maxItems: 100, items: reference('InvoiceLineInput') },
    },
  },
  Invoice: {
    allOf: [
      reference('InvoiceInput'),
      {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          number: { type: 'string' },
          status: { type: 'string', enum: ['complete', 'pending', 'cancelled'] },
          favorite: { type: 'boolean' },
          subtotal: { type: 'number' },
          total: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  UpdateInvoiceInput: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      customerId: { type: ['string', 'null'], format: 'uuid' },
      customerName: { type: 'string', maxLength: 160 },
      email: { type: 'string', format: 'email' },
      address: { type: ['string', 'null'], maxLength: 300 },
      issuedAt: { type: 'string', format: 'date-time' },
      dueAt: { type: ['string', 'null'], format: 'date-time' },
      currency: { type: 'string' },
      discount: { type: 'number', minimum: 0, maximum: 100 },
      items: { type: 'array', minItems: 1, maxItems: 100, items: reference('InvoiceLineInput') },
    },
  },
  Person: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      avatarUrl: { type: ['string', 'null'], format: 'uri' },
      color: { type: 'string' },
    },
  },
  ScheduleInput: {
    type: 'object',
    required: ['title', 'startsAt'],
    additionalProperties: false,
    properties: {
      title: { type: 'string', maxLength: 160 },
      description: { type: ['string', 'null'], maxLength: 1000 },
      location: { type: ['string', 'null'], maxLength: 200 },
      kind: { type: 'string', enum: ['event', 'reminder', 'task'], default: 'event' },
      startsAt: { type: 'string', format: 'date-time' },
      endsAt: { type: ['string', 'null'], format: 'date-time' },
      attendeeIds: { type: 'array', maxItems: 100, items: { type: 'string', format: 'uuid' } },
    },
  },
  Schedule: {
    allOf: [
      reference('ScheduleInput'),
      {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organizerId: { type: 'string', format: 'uuid' },
          attendees: arrayOf('Person'),
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  UpdateScheduleInput: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      title: { type: 'string', maxLength: 160 },
      description: { type: ['string', 'null'], maxLength: 1000 },
      location: { type: ['string', 'null'], maxLength: 200 },
      kind: { type: 'string', enum: ['event', 'reminder', 'task'] },
      startsAt: { type: 'string', format: 'date-time' },
      endsAt: { type: ['string', 'null'], format: 'date-time' },
      attendeeIds: { type: 'array', maxItems: 100, items: { type: 'string', format: 'uuid' } },
    },
  },
  TaskInput: {
    type: 'object',
    required: ['name', 'category', 'startsAt', 'dueAt'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', maxLength: 160 },
      description: { type: ['string', 'null'], maxLength: 1000 },
      category: { type: 'string', enum: ['design', 'development', 'research'] },
      startsAt: { type: 'string', format: 'date-time' },
      dueAt: { type: 'string', format: 'date-time' },
      status: { type: 'string', enum: ['todo', 'doing', 'done'], default: 'todo' },
      assigneeIds: { type: 'array', maxItems: 100, items: { type: 'string', format: 'uuid' } },
    },
  },
  Task: {
    allOf: [
      reference('TaskInput'),
      {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdById: { type: 'string', format: 'uuid' },
          assignees: arrayOf('Person'),
          memberCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  UpdateTaskInput: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      name: { type: 'string', maxLength: 160 },
      description: { type: ['string', 'null'], maxLength: 1000 },
      category: { type: 'string', enum: ['design', 'development', 'research'] },
      startsAt: { type: 'string', format: 'date-time' },
      dueAt: { type: 'string', format: 'date-time' },
      assigneeIds: { type: 'array', maxItems: 100, items: { type: 'string', format: 'uuid' } },
    },
  },
  DashboardMetric: {
    type: 'object',
    properties: {
      id: { type: 'string', enum: ['products', 'stock', 'revenue', 'customers'] },
      label: { type: 'string' },
      value: { type: 'number' },
      currency: { type: ['string', 'null'] },
    },
  },
  DashboardReports: {
    type: 'object',
    description: 'Sales series, transaction distribution, recent orders and top products.',
    properties: {
      sales: { type: 'object' },
      transactions: { type: 'object' },
      recentOrders: { type: 'array', items: { type: 'object' } },
      topProducts: { type: 'array', items: { type: 'object' } },
    },
  },
};

const standardListParameters = [
  ...paginationParameters,
  query('search', { type: 'string', maxLength: 100 }),
];

export const openApiDocument: OpenApiObject = {
  openapi: '3.1.0',
  info: {
    title: 'Nexora Workspace API',
    version: '1.0.0',
    description:
      'REST API for authentication, workspace management, invoicing, scheduling, tasks and business reporting.',
  },
  servers: [{ url: '/api', description: 'Current environment' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Profile' },
    { name: 'Customers' },
    { name: 'Products' },
    { name: 'Invoices' },
    { name: 'Schedules' },
    { name: 'Calendar' },
    { name: 'Tasks' },
    { name: 'Dashboard' },
    { name: 'Documentation' },
  ],
  paths: {
    '/health': {
      get: operation('Health', 'Check API health', {
        security: false,
        successSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            service: { type: 'string', example: 'nexora-api' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
          },
        },
      }),
    },
    '/openapi.json': {
      get: operation('Documentation', 'Get OpenAPI document', {
        security: false,
        successSchema: { type: 'object' },
      }),
    },
    '/docs': {
      get: {
        tags: ['Documentation'],
        summary: 'Open Swagger UI',
        operationId: 'documentationOpenSwaggerUI',
        responses: {
          '200': {
            description: 'Interactive API documentation.',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/auth/register': {
      post: operation('Authentication', 'Register account', {
        security: false,
        body: reference('RegisterInput'),
        successStatus: '201',
        successSchema: dataEnvelope(reference('RegisteredAccount')),
      }),
    },
    '/auth/login': {
      post: operation('Authentication', 'Log in', {
        security: false,
        body: reference('LoginInput'),
        successSchema: dataEnvelope(reference('AuthSession')),
      }),
    },
    '/auth/refresh': {
      post: operation('Authentication', 'Refresh session', {
        security: false,
        body: reference('RefreshTokenInput'),
        successSchema: dataEnvelope(reference('AuthSession')),
      }),
    },
    '/auth/logout': {
      post: operation('Authentication', 'Log out', {
        security: false,
        body: reference('RefreshTokenInput'),
        successStatus: '204',
      }),
    },
    '/auth/forgot-password': {
      post: operation('Authentication', 'Request password reset', {
        security: false,
        body: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        },
        successStatus: '202',
      }),
    },
    '/auth/reset-password': {
      post: operation('Authentication', 'Reset password', {
        security: false,
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string', minLength: 64 },
            password: { type: 'string', format: 'password', minLength: 8 },
          },
        },
        successStatus: '204',
      }),
    },
    '/users/me': {
      get: operation('Profile', 'Get current profile', {
        successSchema: dataEnvelope(reference('UserProfile')),
      }),
      patch: operation('Profile', 'Update current profile', {
        body: reference('UpdateProfileInput'),
        successSchema: dataEnvelope(reference('UserProfile')),
      }),
    },
    '/customers': {
      get: operation('Customers', 'List customers', {
        parameters: [
          ...standardListParameters,
          query('gender', { type: 'string', enum: ['male', 'female', 'non-binary'] }),
          query('sort', { type: 'string', enum: ['name', 'email', 'createdAt'], default: 'name' }),
          query('order', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
        ],
        successSchema: pageEnvelope('Customer'),
      }),
      post: operation('Customers', 'Create customer', {
        body: reference('CustomerInput'),
        successStatus: '201',
        successSchema: dataEnvelope(reference('Customer')),
      }),
    },
    '/customers/{id}': {
      get: operation('Customers', 'Get customer', {
        parameters: [pathId],
        successSchema: dataEnvelope(reference('Customer')),
      }),
      patch: operation('Customers', 'Update customer', {
        parameters: [pathId],
        body: reference('UpdateCustomerInput'),
        successSchema: dataEnvelope(reference('Customer')),
      }),
      delete: operation('Customers', 'Delete customer', {
        parameters: [pathId],
        successStatus: '204',
      }),
    },
    '/products': {
      get: operation('Products', 'List products', {
        parameters: [
          ...standardListParameters,
          query('category', { type: 'string' }),
          query('active', { type: 'boolean' }),
          query('sort', {
            type: 'string',
            enum: ['name', 'price', 'stock', 'createdAt'],
            default: 'name',
          }),
          query('order', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
        ],
        successSchema: pageEnvelope('Product'),
      }),
      post: operation('Products', 'Create product', {
        body: reference('ProductInput'),
        successStatus: '201',
        successSchema: dataEnvelope(reference('Product')),
      }),
    },
    '/products/analytics': {
      get: operation('Products', 'Get product analytics', {
        parameters: dateRangeParameters,
        successSchema: dataEnvelope({ type: 'object' }),
      }),
    },
    '/products/{id}': {
      get: operation('Products', 'Get product', {
        parameters: [pathId],
        successSchema: dataEnvelope(reference('Product')),
      }),
      patch: operation('Products', 'Update product', {
        parameters: [pathId],
        body: reference('UpdateProductInput'),
        successSchema: dataEnvelope(reference('Product')),
      }),
      delete: operation('Products', 'Delete product', {
        parameters: [pathId],
        successStatus: '204',
      }),
    },
    '/invoices': {
      get: operation('Invoices', 'List invoices', {
        parameters: [
          ...standardListParameters,
          query('status', { type: 'string', enum: ['complete', 'pending', 'cancelled'] }),
          query('favorite', { type: 'boolean' }),
          ...dateRangeParameters,
          query('sort', {
            type: 'string',
            enum: ['issuedAt', 'dueAt', 'customerName', 'total', 'createdAt'],
            default: 'issuedAt',
          }),
          query('order', { type: 'string', enum: ['asc', 'desc'], default: 'desc' }),
        ],
        successSchema: pageEnvelope('Invoice'),
      }),
      post: operation('Invoices', 'Create invoice', {
        body: reference('InvoiceInput'),
        successStatus: '201',
        successSchema: dataEnvelope(reference('Invoice')),
      }),
    },
    '/invoices/{id}': {
      get: operation('Invoices', 'Get invoice', {
        parameters: [pathId],
        successSchema: dataEnvelope(reference('Invoice')),
      }),
      patch: operation('Invoices', 'Update invoice', {
        parameters: [pathId],
        body: reference('UpdateInvoiceInput'),
        successSchema: dataEnvelope(reference('Invoice')),
      }),
      delete: operation('Invoices', 'Delete invoice', {
        parameters: [pathId],
        successStatus: '204',
      }),
    },
    '/invoices/{id}/status': {
      patch: operation('Invoices', 'Update invoice status', {
        parameters: [pathId],
        body: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['complete', 'pending', 'cancelled'] } },
        },
        successSchema: dataEnvelope(reference('Invoice')),
      }),
    },
    '/invoices/{id}/favorite': {
      patch: operation('Invoices', 'Update invoice favorite', {
        parameters: [pathId],
        body: {
          type: 'object',
          required: ['favorite'],
          properties: { favorite: { type: 'boolean' } },
        },
        successSchema: dataEnvelope(reference('Invoice')),
      }),
    },
    '/schedules': {
      get: operation('Schedules', 'List schedules', {
        parameters: [
          ...standardListParameters,
          query('kind', { type: 'string', enum: ['event', 'reminder', 'task'] }),
          query('attendeeId', { type: 'string', format: 'uuid' }),
          ...dateRangeParameters,
          query('order', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
        ],
        successSchema: pageEnvelope('Schedule'),
      }),
      post: operation('Schedules', 'Create schedule', {
        body: reference('ScheduleInput'),
        successStatus: '201',
        successSchema: dataEnvelope(reference('Schedule')),
      }),
    },
    '/schedules/people': {
      get: operation('Schedules', 'List schedule people', {
        successSchema: dataEnvelope(arrayOf('Person')),
      }),
    },
    '/schedules/{id}': {
      get: operation('Schedules', 'Get schedule', {
        parameters: [pathId],
        successSchema: dataEnvelope(reference('Schedule')),
      }),
      patch: operation('Schedules', 'Update schedule', {
        parameters: [pathId],
        body: reference('UpdateScheduleInput'),
        successSchema: dataEnvelope(reference('Schedule')),
      }),
      delete: operation('Schedules', 'Delete schedule', {
        parameters: [pathId],
        successStatus: '204',
      }),
    },
    '/calendar/events': {
      get: operation('Calendar', 'List calendar events', {
        parameters: [
          { ...query('from', { type: 'string', format: 'date' }), required: true },
          { ...query('to', { type: 'string', format: 'date' }), required: true },
          query('attendeeId', { type: 'string', format: 'uuid' }),
          query('kind', { type: 'string', enum: ['event', 'reminder', 'task'] }),
        ],
        successSchema: {
          type: 'object',
          properties: { data: arrayOf('Schedule'), meta: { type: 'object' } },
        },
      }),
    },
    '/tasks': {
      get: operation('Tasks', 'List tasks', {
        parameters: [
          ...standardListParameters,
          query('status', { type: 'string', enum: ['todo', 'doing', 'done'] }),
          query('category', { type: 'string', enum: ['design', 'development', 'research'] }),
          query('assigneeId', { type: 'string', format: 'uuid' }),
          ...dateRangeParameters,
          query('sort', {
            type: 'string',
            enum: ['name', 'startsAt', 'dueAt', 'createdAt'],
            default: 'dueAt',
          }),
          query('order', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
        ],
        successSchema: pageEnvelope('Task'),
      }),
      post: operation('Tasks', 'Create task', {
        body: reference('TaskInput'),
        successStatus: '201',
        successSchema: dataEnvelope(reference('Task')),
      }),
    },
    '/tasks/people': {
      get: operation('Tasks', 'List task people', {
        successSchema: dataEnvelope(arrayOf('Person')),
      }),
    },
    '/tasks/{id}': {
      get: operation('Tasks', 'Get task', {
        parameters: [pathId],
        successSchema: dataEnvelope(reference('Task')),
      }),
      patch: operation('Tasks', 'Update task', {
        parameters: [pathId],
        body: reference('UpdateTaskInput'),
        successSchema: dataEnvelope(reference('Task')),
      }),
      delete: operation('Tasks', 'Delete task', {
        parameters: [pathId],
        successStatus: '204',
      }),
    },
    '/tasks/{id}/status': {
      patch: operation('Tasks', 'Update task status', {
        parameters: [pathId],
        body: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['todo', 'doing', 'done'] } },
        },
        successSchema: dataEnvelope(reference('Task')),
      }),
    },
    '/dashboard/metrics': {
      get: operation('Dashboard', 'Get dashboard metrics', {
        parameters: [
          ...dateRangeParameters,
          query('currency', { type: 'string', minLength: 3, maxLength: 3, default: 'USD' }),
        ],
        successSchema: {
          type: 'object',
          properties: { data: arrayOf('DashboardMetric'), meta: { type: 'object' } },
        },
      }),
    },
    '/dashboard/reports': {
      get: operation('Dashboard', 'Get dashboard reports', {
        parameters: [
          ...dateRangeParameters,
          query('currency', { type: 'string', minLength: 3, maxLength: 3, default: 'USD' }),
          query('interval', { type: 'string', enum: ['day', 'week', 'month'], default: 'week' }),
          query('recentLimit', { type: 'integer', minimum: 1, maximum: 20, default: 4 }),
          query('productLimit', { type: 'integer', minimum: 1, maximum: 20, default: 5 }),
        ],
        successSchema: {
          type: 'object',
          properties: { data: reference('DashboardReports'), meta: { type: 'object' } },
        },
      }),
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses: {
      Unauthorized: response('Authentication is required.', reference('Error')),
      ValidationError: response('Request validation failed.', reference('Error')),
    },
    schemas,
  },
};
