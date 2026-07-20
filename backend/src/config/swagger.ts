import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LegalEase REST API",
      version: "1.0.0",
      description: "Backend REST API for LegalEase Contract Analysis Platform",
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Jane Doe" },
            email: { type: "string", format: "email", example: "jane.doe@example.com" },
            password: { type: "string", format: "password", example: "securePassword123" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "jane.doe@example.com" },
            password: { type: "string", format: "password", example: "securePassword123" },
          },
        },
        RefreshRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6..." },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
            name: { type: "string", example: "Jane Doe" },
            email: { type: "string", format: "email", example: "jane.doe@example.com" },
            created_at: { type: "string", format: "date-time", example: "2026-07-20T18:00:00.000Z" },
          },
        },
        AuthSuccessResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Login successful" },
            user: { $ref: "#/components/schemas/User" },
            tokens: {
              type: "object",
              properties: {
                accessToken: { type: "string", example: "eyJhbGciOiJIUzI1..." },
                refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1..." },
              },
            },
          },
        },
        RefreshSuccessResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Token refreshed successfully" },
            tokens: {
              type: "object",
              properties: {
                accessToken: { type: "string", example: "eyJhbGciOiJIUzI1..." },
                refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1..." },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["error_code", "message"],
          properties: {
            error_code: { type: "string", example: "VALIDATION_ERROR" },
            message: { type: "string", example: "Validation failed" },
            details: {
              type: "array",
              items: { type: "object" },
              example: [{ field: "email", message: "Invalid email format" }],
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            timestamp: { type: "string", example: "2026-07-20T18:00:00.000Z" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/app.ts", "./dist/routes/*.js", "./dist/app.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
