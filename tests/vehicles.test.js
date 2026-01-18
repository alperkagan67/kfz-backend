/**
 * Vehicle CRUD Tests
 *
 * KFZ-6: Vehicle CRUD - Update & Delete Operations
 *
 * Tests all Acceptance Criteria:
 * - AC-1: PUT /api/vehicles/:id updates vehicle
 * - AC-2: DELETE /api/vehicles/:id deletes vehicle
 * - AC-3: Only admins can delete
 * - AC-4: 404 for non-existent vehicle
 * - AC-5: Tests for all endpoints
 */

import { describe, test, expect, beforeEach, afterAll } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../server.js'
import { clearVehicles, addVehicle } from '../data/vehicles.js'
import { clearUsers, addUser } from '../data/users.js'
import bcrypt from 'bcryptjs'

const JWT_SECRET = 'kfz-handelsplattform-secret-key-2025'

// Helper to create JWT token
function createToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

describe('KFZ-6: Vehicle CRUD Operations', () => {
  let adminToken
  let userToken
  let testVehicleId

  beforeEach(async () => {
    // Clear data
    clearVehicles()
    clearUsers()

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10)
    const admin = {
      id: 'admin-1',
      email: 'admin@test.com',
      password: adminPassword,
      name: 'Test Admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
    addUser(admin)
    adminToken = createToken(admin)

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10)
    const user = {
      id: 'user-1',
      email: 'user@test.com',
      password: userPassword,
      name: 'Test User',
      role: 'user',
      createdAt: new Date().toISOString()
    }
    addUser(user)
    userToken = createToken(user)

    // Create test vehicle
    const vehicle = addVehicle({
      id: 'vehicle-test-1',
      brand: 'BMW',
      model: '320i',
      year: 2020,
      price: 25000,
      mileage: 50000,
      description: 'Test vehicle',
      images: []
    })
    testVehicleId = vehicle.id
  })

  // ============================================
  // AC-5: Tests for all endpoints
  // ============================================
  describe('GET /api/vehicles', () => {
    test('returns all vehicles', async () => {
      const response = await request(app)
        .get('/api/vehicles')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(1)
      expect(response.body[0].brand).toBe('BMW')
    })
  })

  describe('GET /api/vehicles/:id', () => {
    test('returns single vehicle by ID', async () => {
      const response = await request(app)
        .get(`/api/vehicles/${testVehicleId}`)

      expect(response.status).toBe(200)
      expect(response.body.id).toBe(testVehicleId)
      expect(response.body.brand).toBe('BMW')
    })

    test('AC-4: returns 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/vehicles/non-existent-id')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Nicht gefunden')
    })
  })

  describe('POST /api/vehicles', () => {
    test('creates new vehicle', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          brand: 'Audi',
          model: 'A4',
          year: 2021,
          price: 35000
        })

      expect(response.status).toBe(201)
      expect(response.body.brand).toBe('Audi')
      expect(response.body.model).toBe('A4')
      expect(response.body.id).toBeDefined()
    })

    test('returns 400 if brand or model missing', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          year: 2021
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validierungsfehler')
    })
  })

  // ============================================
  // AC-1: PUT /api/vehicles/:id updates vehicle
  // ============================================
  describe('PUT /api/vehicles/:id', () => {
    test('AC-1.1: updates vehicle with valid token', async () => {
      const response = await request(app)
        .put(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 23000,
          mileage: 55000
        })

      expect(response.status).toBe(200)
      expect(response.body.price).toBe(23000)
      expect(response.body.mileage).toBe(55000)
      expect(response.body.brand).toBe('BMW') // unchanged
    })

    test('AC-1.2: returns 401 without token', async () => {
      const response = await request(app)
        .put(`/api/vehicles/${testVehicleId}`)
        .send({
          price: 23000
        })

      expect(response.status).toBe(401)
    })

    test('AC-4: returns 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .put('/api/vehicles/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 23000
        })

      expect(response.status).toBe(404)
    })
  })

  // ============================================
  // AC-2: DELETE /api/vehicles/:id deletes vehicle
  // ============================================
  describe('DELETE /api/vehicles/:id', () => {
    test('AC-2.1: admin can delete vehicle', async () => {
      const response = await request(app)
        .delete(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Fahrzeug erfolgreich gelöscht')

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/vehicles/${testVehicleId}`)

      expect(getResponse.status).toBe(404)
    })

    // ============================================
    // AC-3: Only admins can delete
    // ============================================
    test('AC-3.1: non-admin cannot delete vehicle', async () => {
      const response = await request(app)
        .delete(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('Zugriff verweigert')
    })

    test('AC-2.2: returns 401 without token', async () => {
      const response = await request(app)
        .delete(`/api/vehicles/${testVehicleId}`)

      expect(response.status).toBe(401)
    })

    test('AC-4: returns 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .delete('/api/vehicles/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(404)
    })
  })
})
