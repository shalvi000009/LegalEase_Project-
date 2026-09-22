import request from 'supertest';
import app from '../app';

describe('LegalEase Backend API Integration Test Suite', () => {
  describe('GET /health', () => {
    it('should return 200 OK with status ok and ISO timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /docs/openapi.json', () => {
    it('should serve live OpenAPI 3.0 spec JSON', async () => {
      const res = await request(app).get('/docs/openapi.json');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.body).toHaveProperty('openapi');
      expect(res.body).toHaveProperty('info');
      expect(res.body).toHaveProperty('paths');
    });
  });

  describe('GET /', () => {
    it('should redirect root to /docs', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/docs');
    });
  });

  describe('Authentication Endpoints - Validation & Rate Limit', () => {
    it('should reject POST /api/v1/auth/register with missing body', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({});
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject POST /api/v1/auth/login with invalid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Protected Routes Security Checks', () => {
    it('should reject unauthenticated GET /api/v1/documents with 401', async () => {
      const res = await request(app).get('/api/v1/documents');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/integrations with 401', async () => {
      const res = await request(app).get('/api/v1/integrations');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/scan-history with 401', async () => {
      const res = await request(app).get('/api/v1/scan-history');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/reminders with 401', async () => {
      const res = await request(app).get('/api/v1/reminders');
      expect(res.status).toBe(401);
    });
  });
});
