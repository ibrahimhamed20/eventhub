import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config/index.js';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'EventHub API',
      version: '1.0.0',
      description:
        'Event booking platform. Demonstrates auth, RBAC, transactional booking with capacity limits, cursor pagination, and rate limiting.',
    },
    servers: [{ url: `http://localhost:${config.port}`, description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['attendee', 'organizer', 'admin'] },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            venue: { type: 'string' },
            startsAt: { type: 'string', format: 'date-time' },
            capacity: { type: 'integer' },
            seatsTaken: { type: 'integer' },
            seatsAvailable: { type: 'integer' },
            priceCents: { type: 'integer' },
            status: { type: 'string', enum: ['draft', 'published', 'cancelled'] },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            eventId: { type: 'integer' },
            userId: { type: 'integer' },
            seats: { type: 'integer' },
            totalCents: { type: 'integer' },
            status: { type: 'string', enum: ['confirmed', 'cancelled'] },
          },
        },
      },
    },
  },
  // JSDoc comments in these files become the API documentation
  apis: ['./src/modules/**/*.routes.ts'],
});
