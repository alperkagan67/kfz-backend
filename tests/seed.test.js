/**
 * Seeding Tests
 *
 * KAN-4: Backend User Seeding
 *
 * Tests all Acceptance Criteria:
 * - AC-1: Seed Script Existence (1 test)
 * - AC-2: Test User Creation (3 tests)
 * - AC-3: Idempotent Seeding (2 tests)
 * - AC-4: Login with Seeded User (1 test)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import app from '../server.js'
import { seedUsers } from '../scripts/seed.js'
import { getUsers, clearUsers, findUserByEmail } from '../data/users.js'

describe('KAN-4: Backend User Seeding', () => {

  beforeEach(() => {
    // Clear users before each test
    clearUsers()
  })

  // ============================================
  // AC-1: Seed Script Existence
  // ============================================
  describe('AC-1: Seed Script Existence', () => {

    test('AC-1.1: Seed script executes without errors', async () => {
      // Given: The project is set up
      // When: The seed function runs
      const result = await seedUsers()

      // Then: The script executes without errors
      expect(result).toBeDefined()
      expect(result.errors).toEqual([])
      expect(result.created.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // AC-2: Test User Creation
  // ============================================
  describe('AC-2: Test User Creation', () => {

    test('AC-2.1: Test admin user is created with email admin@test.com', async () => {
      // Given: An empty database
      expect(getUsers().length).toBe(0)

      // When: The seed script runs
      await seedUsers()

      // Then: A test admin user is created with email admin@test.com
      const adminUser = findUserByEmail('admin@test.com')
      expect(adminUser).toBeDefined()
      expect(adminUser.email).toBe('admin@test.com')
    })

    test('AC-2.2: Test user has a bcrypt-hashed password', async () => {
      // Given: An empty database
      expect(getUsers().length).toBe(0)

      // When: The seed script runs
      await seedUsers()

      // Then: The test user has a bcrypt-hashed password
      const adminUser = findUserByEmail('admin@test.com')
      expect(adminUser.password).toBeDefined()
      // Bcrypt hashes start with $2a$ or $2b$
      expect(adminUser.password).toMatch(/^\$2[ab]\$/)
      // Verify the password can be compared correctly
      const isValid = await bcrypt.compare('test123', adminUser.password)
      expect(isValid).toBe(true)
    })

    test('AC-2.3: Test user has role admin', async () => {
      // Given: An empty database
      expect(getUsers().length).toBe(0)

      // When: The seed script runs
      await seedUsers()

      // Then: The test user has role admin
      const adminUser = findUserByEmail('admin@test.com')
      expect(adminUser.role).toBe('admin')
    })
  })

  // ============================================
  // AC-3: Idempotent Seeding
  // ============================================
  describe('AC-3: Idempotent Seeding', () => {

    test('AC-3.1: No duplicate users are created when seeding twice', async () => {
      // Given: Test users already exist (first seed)
      await seedUsers()
      const initialUserCount = getUsers().length

      // When: The seed script runs again
      const result = await seedUsers()

      // Then: No duplicate users are created
      expect(getUsers().length).toBe(initialUserCount)
      expect(result.skipped.length).toBeGreaterThan(0)
      expect(result.created.length).toBe(0)
    })

    test('AC-3.2: Existing users are not modified when seeding again', async () => {
      // Given: Test users already exist
      await seedUsers()
      const adminUser = findUserByEmail('admin@test.com')
      const originalId = adminUser.id
      const originalPassword = adminUser.password
      const originalCreatedAt = adminUser.createdAt

      // When: The seed script runs again
      await seedUsers()

      // Then: Existing users are not modified
      const adminUserAfter = findUserByEmail('admin@test.com')
      expect(adminUserAfter.id).toBe(originalId)
      expect(adminUserAfter.password).toBe(originalPassword)
      expect(adminUserAfter.createdAt).toBe(originalCreatedAt)
    })
  })

  // ============================================
  // AC-4: Login with Seeded User
  // ============================================
  describe('AC-4: Login with Seeded User', () => {

    test('AC-4.1: Login with admin@test.com and password test123 returns valid JWT', async () => {
      // Given: The seed script has run
      await seedUsers()

      // When: I login with admin@test.com and password test123
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'test123'
        })

      // Then: I receive a valid JWT token
      expect(response.status).toBe(200)
      expect(response.body.token).toBeDefined()
      expect(response.body.token.split('.').length).toBe(3) // JWT has 3 parts
      expect(response.body.user.email).toBe('admin@test.com')
      expect(response.body.user.role).toBe('admin')
    })
  })
})
