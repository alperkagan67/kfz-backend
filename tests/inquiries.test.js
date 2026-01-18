/**
 * Inquiry API Tests
 *
 * KFZ-15: Customer Inquiry System
 *
 * Tests all Acceptance Criteria:
 * - AC-1: POST /api/inquiries with vehicleId, email, name, phone, message
 * - AC-2: Validation of all required fields
 * - AC-3: Inquiry stored with timestamp and status 'new'
 * - AC-4: GET /api/inquiries?status=new&limit=10 for admin
 * - AC-5: PUT /api/inquiries/:id updates status
 * - AC-6: Only admin can update status
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import request from 'supertest'
import app from '../server.js'
import { clearVehicles, addVehicle } from '../data/vehicles.js'
import { clearInquiries, addInquiry, getInquiryById } from '../data/inquiries.js'
import { clearUsers } from '../data/users.js'
import { seedUsers } from '../scripts/seed.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'kfz-handelsplattform-secret-key-2025'

describe('KFZ-15: Customer Inquiry System', () => {
  let adminToken
  let userToken
  let testVehicle

  beforeEach(async () => {
    // Clear data
    clearInquiries()
    clearVehicles()
    clearUsers()

    // Create test vehicle
    testVehicle = addVehicle({
      id: 'v1',
      brand: 'BMW',
      model: '320i',
      year: 2020,
      price: 25000,
      mileage: 50000
    })

    // Create test users using seed
    await seedUsers()

    // Generate tokens
    adminToken = jwt.sign(
      { userId: 'admin1', email: 'admin@test.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    userToken = jwt.sign(
      { userId: 'user1', email: 'user@test.com', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    )
  })

  afterEach(() => {
    clearInquiries()
  })

  // ============================================
  // AC-1: POST /api/inquiries
  // ============================================
  describe('AC-1: Create Inquiry', () => {
    test('AC-1.1: Creates inquiry with valid data', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          vehicleId: 'v1',
          name: 'Max Mustermann',
          email: 'max@example.com',
          phone: '0123456789',
          message: 'Ich interessiere mich fuer dieses Fahrzeug.'
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.vehicleId).toBe('v1')
      expect(response.body.name).toBe('Max Mustermann')
      expect(response.body.email).toBe('max@example.com')
    })

    test('AC-1.2: Creates inquiry without phone (optional)', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          vehicleId: 'v1',
          name: 'Max Mustermann',
          email: 'max@example.com',
          message: 'Ich interessiere mich fuer dieses Fahrzeug.'
        })

      expect(response.status).toBe(201)
      expect(response.body.phone).toBeNull()
    })
  })

  // ============================================
  // AC-2: Validation
  // ============================================
  describe('AC-2: Validation', () => {
    test('AC-2.1: Rejects missing vehicleId', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          name: 'Max Mustermann',
          email: 'max@example.com',
          message: 'Ich interessiere mich fuer dieses Fahrzeug.'
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('vehicleId')
    })

    test('AC-2.2: Rejects non-existent vehicleId', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          vehicleId: 'nonexistent',
          name: 'Max Mustermann',
          email: 'max@example.com',
          message: 'Ich interessiere mich fuer dieses Fahrzeug.'
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('nicht gefunden')
    })

    test('AC-2.3: Rejects missing name', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          vehicleId: 'v1',
          email: 'max@example.com',
          message: 'Ich interessiere mich fuer dieses Fahrzeug.'
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Name')
    })

    test('AC-2.4: Rejects invalid email', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          vehicleId: 'v1',
          name: 'Max Mustermann',
          email: 'invalid-email',
          message: 'Ich interessiere mich fuer dieses Fahrzeug.'
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Email')
    })

    test('AC-2.5: Rejects short message', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          vehicleId: 'v1',
          name: 'Max Mustermann',
          email: 'max@example.com',
          message: 'Hi'
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('10 Zeichen')
    })
  })

  // ============================================
  // AC-3: Timestamp and Status
  // ============================================
  describe('AC-3: Timestamp and Status', () => {
    test('AC-3.1: Inquiry is stored with createdAt timestamp', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          vehicleId: 'v1',
          name: 'Max Mustermann',
          email: 'max@example.com',
          message: 'Ich interessiere mich fuer dieses Fahrzeug.'
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('createdAt')
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date)
    })

    test('AC-3.2: Inquiry is stored with status new', async () => {
      const response = await request(app)
        .post('/api/inquiries')
        .send({
          vehicleId: 'v1',
          name: 'Max Mustermann',
          email: 'max@example.com',
          message: 'Ich interessiere mich fuer dieses Fahrzeug.'
        })

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('new')
    })
  })

  // ============================================
  // AC-4: GET inquiries (admin only)
  // ============================================
  describe('AC-4: Get Inquiries', () => {
    beforeEach(() => {
      // Add test inquiries
      addInquiry({
        id: 'inq1',
        vehicleId: 'v1',
        name: 'Max',
        email: 'max@example.com',
        message: 'Inquiry 1 message'
      })
      addInquiry({
        id: 'inq2',
        vehicleId: 'v1',
        name: 'Anna',
        email: 'anna@example.com',
        message: 'Inquiry 2 message'
      })
    })

    test('AC-4.1: Admin can list all inquiries', async () => {
      const response = await request(app)
        .get('/api/inquiries')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('inquiries')
      expect(response.body.inquiries).toHaveLength(2)
    })

    test('AC-4.2: Can filter by status', async () => {
      const response = await request(app)
        .get('/api/inquiries?status=new')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      response.body.inquiries.forEach(inq => {
        expect(inq.status).toBe('new')
      })
    })

    test('AC-4.3: Supports pagination with limit', async () => {
      const response = await request(app)
        .get('/api/inquiries?limit=1')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.inquiries).toHaveLength(1)
      expect(response.body.totalPages).toBe(2)
    })

    test('AC-4.4: Regular user cannot list inquiries', async () => {
      const response = await request(app)
        .get('/api/inquiries')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
    })

    test('AC-4.5: Unauthenticated request is rejected', async () => {
      const response = await request(app).get('/api/inquiries')

      expect(response.status).toBe(401)
    })
  })

  // ============================================
  // AC-5: Update inquiry status
  // ============================================
  describe('AC-5: Update Status', () => {
    beforeEach(() => {
      addInquiry({
        id: 'inq1',
        vehicleId: 'v1',
        name: 'Max',
        email: 'max@example.com',
        message: 'Inquiry 1 message'
      })
    })

    test('AC-5.1: Admin can update status to contacted', async () => {
      const response = await request(app)
        .put('/api/inquiries/inq1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'contacted' })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('contacted')
    })

    test('AC-5.2: Admin can update status to closed', async () => {
      const response = await request(app)
        .put('/api/inquiries/inq1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'closed' })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('closed')
    })

    test('AC-5.3: Rejects invalid status', async () => {
      const response = await request(app)
        .put('/api/inquiries/inq1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid' })

      expect(response.status).toBe(400)
    })

    test('AC-5.4: Returns 404 for non-existent inquiry', async () => {
      const response = await request(app)
        .put('/api/inquiries/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'closed' })

      expect(response.status).toBe(404)
    })
  })

  // ============================================
  // AC-6: Admin only
  // ============================================
  describe('AC-6: Admin Only Access', () => {
    beforeEach(() => {
      addInquiry({
        id: 'inq1',
        vehicleId: 'v1',
        name: 'Max',
        email: 'max@example.com',
        message: 'Inquiry 1 message'
      })
    })

    test('AC-6.1: Regular user cannot update status', async () => {
      const response = await request(app)
        .put('/api/inquiries/inq1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'closed' })

      expect(response.status).toBe(403)
    })

    test('AC-6.2: Regular user cannot delete inquiry', async () => {
      const response = await request(app)
        .delete('/api/inquiries/inq1')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
    })

    test('AC-6.3: Admin can delete inquiry', async () => {
      const response = await request(app)
        .delete('/api/inquiries/inq1')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)

      // Verify deleted
      const inquiry = getInquiryById('inq1')
      expect(inquiry).toBeUndefined()
    })
  })
})
