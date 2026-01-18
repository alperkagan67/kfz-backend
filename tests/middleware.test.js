/**
 * Middleware Tests
 *
 * KFZ-7: Protected Routes - JWT Middleware
 *
 * Tests all Acceptance Criteria:
 * - AC-1: authMiddleware checks JWT Token
 * - AC-2: 401 for missing/invalid token
 * - AC-3: req.user is set with valid token
 * - AC-4: Vehicle routes are protected
 * - AC-5: Public routes (login, register) remain open
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import app from '../server.js'
import { clearUsers, addUser } from '../data/users.js'
import { clearVehicles, addVehicle } from '../data/vehicles.js'

const JWT_SECRET = 'kfz-handelsplattform-secret-key-2025'

describe('KFZ-7: Protected Routes - JWT Middleware', () => {
  let validToken
  let expiredToken
  let invalidToken
  let testVehicleId

  beforeEach(async () => {
    clearUsers()
    clearVehicles()

    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 10)
    const user = {
      id: 'test-user-1',
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
    addUser(user)

    // Create valid token
    validToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Create expired token
    expiredToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '-1h' } // Already expired
    )

    // Create invalid token (wrong secret)
    invalidToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      'wrong-secret',
      { expiresIn: '1h' }
    )

    // Create test vehicle
    const vehicle = addVehicle({
      id: 'vehicle-1',
      brand: 'BMW',
      model: '320i'
    })
    testVehicleId = vehicle.id
  })

  // ============================================
  // AC-5: Public routes remain open
  // ============================================
  describe('AC-5: Public Routes', () => {
    test('AC-5.1: GET /api/vehicles is public', async () => {
      const response = await request(app)
        .get('/api/vehicles')

      expect(response.status).toBe(200)
    })

    test('AC-5.2: GET /api/vehicles/:id is public', async () => {
      const response = await request(app)
        .get(`/api/vehicles/${testVehicleId}`)

      expect(response.status).toBe(200)
    })

    test('AC-5.3: POST /api/auth/login is public', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'test123'
        })

      expect(response.status).toBe(200)
      expect(response.body.token).toBeDefined()
    })

    test('AC-5.4: POST /api/auth/register is public', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'password123',
          name: 'New User'
        })

      expect(response.status).toBe(201)
    })
  })

  // ============================================
  // AC-4: Vehicle routes are protected
  // ============================================
  describe('AC-4: Protected Routes', () => {
    test('AC-4.1: PUT /api/vehicles/:id requires authentication', async () => {
      const response = await request(app)
        .put(`/api/vehicles/${testVehicleId}`)
        .send({ price: 30000 })

      expect(response.status).toBe(401)
    })

    test('AC-4.2: DELETE /api/vehicles/:id requires authentication', async () => {
      const response = await request(app)
        .delete(`/api/vehicles/${testVehicleId}`)

      expect(response.status).toBe(401)
    })

    test('AC-4.3: GET /api/auth/me requires authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')

      expect(response.status).toBe(401)
    })

    test('AC-4.4: POST /api/auth/logout requires authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')

      expect(response.status).toBe(401)
    })
  })

  // ============================================
  // AC-1: authMiddleware checks JWT Token
  // ============================================
  describe('AC-1: Token Validation', () => {
    test('AC-1.1: valid token allows access', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(200)
      expect(response.body.user).toBeDefined()
    })

    test('AC-1.2: valid token allows protected route access', async () => {
      const response = await request(app)
        .put(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ price: 30000 })

      expect(response.status).toBe(200)
    })
  })

  // ============================================
  // AC-2: 401 for missing/invalid token
  // ============================================
  describe('AC-2: Invalid Token Handling', () => {
    test('AC-2.1: missing token returns 401', async () => {
      const response = await request(app)
        .get('/api/auth/me')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Zugriff verweigert')
    })

    test('AC-2.2: expired token returns 403', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('Ungültiger Token')
    })

    test('AC-2.3: invalid token (wrong secret) returns 403', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)

      expect(response.status).toBe(403)
    })

    test('AC-2.4: malformed token returns 403', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt-token')

      expect(response.status).toBe(403)
    })

    test('AC-2.5: missing Bearer prefix returns 401', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', validToken)

      expect(response.status).toBe(401)
    })
  })

  // ============================================
  // AC-3: req.user is set with valid token
  // ============================================
  describe('AC-3: User Data in Request', () => {
    test('AC-3.1: user data is returned from /me endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(200)
      expect(response.body.user.email).toBe('test@example.com')
      expect(response.body.user.role).toBe('admin')
      expect(response.body.user.name).toBe('Test User')
    })

    test('AC-3.2: user role is used for authorization', async () => {
      // Create non-admin user
      const userPassword = await bcrypt.hash('user123', 10)
      addUser({
        id: 'regular-user',
        email: 'regular@example.com',
        password: userPassword,
        name: 'Regular User',
        role: 'user',
        createdAt: new Date().toISOString()
      })

      const userToken = jwt.sign(
        { userId: 'regular-user', email: 'regular@example.com', role: 'user' },
        JWT_SECRET,
        { expiresIn: '1h' }
      )

      // Non-admin cannot delete
      const response = await request(app)
        .delete(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
      expect(response.body.message).toBe('Nur Admins können Fahrzeuge löschen')
    })
  })
})
