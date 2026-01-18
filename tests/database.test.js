/**
 * Database Tests
 *
 * KFZ-5: Database Migration - SQLite Integration
 *
 * Tests all Acceptance Criteria:
 * - AC-1: SQLite/better-sqlite3 installed and configured
 * - AC-2: Users table with correct schema
 * - AC-3: Vehicles table with correct schema
 * - AC-4: Migration script (tables created on import)
 * - AC-5: All existing tests continue to pass
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import db from '../db/database.js'
import {
  getUsers,
  addUser,
  findUserByEmail,
  findUserById,
  clearUsers
} from '../data/users.js'
import {
  getAllVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  clearVehicles
} from '../data/vehicles.js'

describe('KFZ-5: Database Migration - SQLite Integration', () => {

  // ============================================
  // AC-1: SQLite installed and configured
  // ============================================
  describe('AC-1: SQLite Configuration', () => {

    test('AC-1.1: Database connection is established', () => {
      expect(db).toBeDefined()
      expect(db.open).toBe(true)
    })

    test('AC-1.2: Database can execute queries', () => {
      const result = db.prepare('SELECT 1 as test').get()
      expect(result.test).toBe(1)
    })
  })

  // ============================================
  // AC-2: Users Table Schema
  // ============================================
  describe('AC-2: Users Table Schema', () => {

    beforeEach(() => {
      clearUsers()
    })

    test('AC-2.1: Users table exists with correct columns', () => {
      const tableInfo = db.prepare("PRAGMA table_info('users')").all()
      const columnNames = tableInfo.map(col => col.name)

      expect(columnNames).toContain('id')
      expect(columnNames).toContain('email')
      expect(columnNames).toContain('password')
      expect(columnNames).toContain('role')
      expect(columnNames).toContain('createdAt')
    })

    test('AC-2.2: Can insert and retrieve user', () => {
      const user = {
        id: 'test-user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'user',
        createdAt: new Date().toISOString()
      }

      addUser(user)
      const retrieved = findUserByEmail('test@example.com')

      expect(retrieved).toBeDefined()
      expect(retrieved.email).toBe('test@example.com')
      expect(retrieved.role).toBe('user')
    })

    test('AC-2.3: Email is case-insensitive for lookup', () => {
      const user = {
        id: 'test-user-2',
        email: 'Test@Example.COM',
        password: 'hashedpassword',
        name: 'Case Test',
        role: 'admin',
        createdAt: new Date().toISOString()
      }

      addUser(user)
      const retrieved = findUserByEmail('test@example.com')

      expect(retrieved).toBeDefined()
    })

    test('AC-2.4: Can find user by ID', () => {
      const user = {
        id: 'unique-id-123',
        email: 'findbyid@example.com',
        password: 'hashedpassword',
        name: 'Find By ID User',
        role: 'user',
        createdAt: new Date().toISOString()
      }

      addUser(user)
      const retrieved = findUserById('unique-id-123')

      expect(retrieved).toBeDefined()
      expect(retrieved.id).toBe('unique-id-123')
    })

    test('AC-2.5: getUsers returns all users', () => {
      addUser({
        id: 'user-1',
        email: 'user1@example.com',
        password: 'pass1',
        name: 'User One',
        role: 'user',
        createdAt: new Date().toISOString()
      })
      addUser({
        id: 'user-2',
        email: 'user2@example.com',
        password: 'pass2',
        name: 'User Two',
        role: 'admin',
        createdAt: new Date().toISOString()
      })

      const users = getUsers()
      expect(users.length).toBe(2)
    })
  })

  // ============================================
  // AC-3: Vehicles Table Schema
  // ============================================
  describe('AC-3: Vehicles Table Schema', () => {

    beforeEach(() => {
      clearVehicles()
    })

    test('AC-3.1: Vehicles table exists with correct columns', () => {
      const tableInfo = db.prepare("PRAGMA table_info('vehicles')").all()
      const columnNames = tableInfo.map(col => col.name)

      expect(columnNames).toContain('id')
      expect(columnNames).toContain('brand')
      expect(columnNames).toContain('model')
      expect(columnNames).toContain('year')
      expect(columnNames).toContain('price')
      expect(columnNames).toContain('mileage')
      expect(columnNames).toContain('description')
      expect(columnNames).toContain('images')
      expect(columnNames).toContain('createdAt')
    })

    test('AC-3.2: Can insert and retrieve vehicle', () => {
      const vehicle = addVehicle({
        id: 'vehicle-1',
        brand: 'BMW',
        model: '320i',
        year: 2020,
        price: 25000,
        mileage: 50000,
        description: 'Great condition',
        images: ['img1.jpg', 'img2.jpg']
      })

      const retrieved = getVehicleById('vehicle-1')

      expect(retrieved).toBeDefined()
      expect(retrieved.brand).toBe('BMW')
      expect(retrieved.model).toBe('320i')
      expect(retrieved.images).toEqual(['img1.jpg', 'img2.jpg'])
    })

    test('AC-3.3: Can update vehicle', () => {
      addVehicle({
        id: 'vehicle-update',
        brand: 'Audi',
        model: 'A4',
        year: 2019,
        price: 22000
      })

      const updated = updateVehicle('vehicle-update', {
        price: 21000,
        mileage: 60000
      })

      expect(updated.price).toBe(21000)
      expect(updated.mileage).toBe(60000)
      expect(updated.brand).toBe('Audi') // unchanged
    })

    test('AC-3.4: Can delete vehicle', () => {
      addVehicle({
        id: 'vehicle-delete',
        brand: 'Mercedes',
        model: 'C200'
      })

      const deleted = deleteVehicle('vehicle-delete')
      expect(deleted).toBe(true)

      const retrieved = getVehicleById('vehicle-delete')
      expect(retrieved).toBeUndefined()
    })

    test('AC-3.5: getAllVehicles returns all vehicles', () => {
      addVehicle({ id: 'v1', brand: 'BMW', model: '320i' })
      addVehicle({ id: 'v2', brand: 'Audi', model: 'A4' })
      addVehicle({ id: 'v3', brand: 'Mercedes', model: 'C200' })

      const vehicles = getAllVehicles()
      expect(vehicles.length).toBe(3)
    })
  })

  // ============================================
  // AC-4: Migration Script
  // ============================================
  describe('AC-4: Database Migration', () => {

    test('AC-4.1: Tables are created automatically on import', () => {
      // Tables should exist since we imported the database module
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all()

      const tableNames = tables.map(t => t.name)
      expect(tableNames).toContain('users')
      expect(tableNames).toContain('vehicles')
    })
  })
})
