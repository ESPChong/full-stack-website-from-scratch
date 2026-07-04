const request = require('supertest');
const app = require('./app');

describe('GET /api/status', () => {
  it('should return a 200 status and ok message', async () => {
    // Supertest makes a mock HTTP request to your Express app
    const response = await request(app).get('/api/status');
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: 'Backend is successfully connected!'
    });
  });
});
