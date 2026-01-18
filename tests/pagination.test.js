/**
 * Pagination API Tests
 *
 * KFZ-13: Backend Pagination & Filter API for Vehicles
 *
 * Tests all Acceptance Criteria:
 * - AC-1: GET /api/vehicles?page=1&limit=10 returns paginated results
 * - AC-2: Response format: { total, page, limit, vehicles, totalPages }
 * - AC-3: Filter: brand, minPrice, maxPrice, minYear, maxYear
 * - AC-4: Sort: sortBy (price, year, mileage), order (asc, desc)
 * - AC-5: Defaults: page=1, limit=10, max=100
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import request from 'supertest'
import app from '../server.js'
import { clearVehicles, addVehicle } from '../data/vehicles.js'

describe('KFZ-13: Pagination & Filter API', () => {

  beforeEach(() => {
    clearVehicles()

    // Add test vehicles
    const vehicles = [
      { id: 'v1', brand: 'BMW', model: '320i', year: 2020, price: 25000, mileage: 50000 },
      { id: 'v2', brand: 'BMW', model: '520i', year: 2019, price: 35000, mileage: 60000 },
      { id: 'v3', brand: 'Audi', model: 'A4', year: 2021, price: 30000, mileage: 40000 },
      { id: 'v4', brand: 'Audi', model: 'A6', year: 2018, price: 28000, mileage: 80000 },
      { id: 'v5', brand: 'Mercedes', model: 'C200', year: 2022, price: 45000, mileage: 20000 },
      { id: 'v6', brand: 'Mercedes', model: 'E200', year: 2020, price: 50000, mileage: 35000 },
      { id: 'v7', brand: 'VW', model: 'Golf', year: 2021, price: 22000, mileage: 30000 },
      { id: 'v8', brand: 'VW', model: 'Passat', year: 2019, price: 26000, mileage: 55000 },
      { id: 'v9', brand: 'Toyota', model: 'Camry', year: 2020, price: 27000, mileage: 45000 },
      { id: 'v10', brand: 'Honda', model: 'Accord', year: 2021, price: 29000, mileage: 25000 },
      { id: 'v11', brand: 'Ford', model: 'Focus', year: 2018, price: 18000, mileage: 90000 },
      { id: 'v12', brand: 'Opel', model: 'Astra', year: 2019, price: 16000, mileage: 70000 }
    ]

    vehicles.forEach(v => addVehicle(v))
  })

  // ============================================
  // AC-1: Paginated results
  // ============================================
  describe('AC-1: Pagination', () => {

    test('AC-1.1: returns paginated results with page and limit', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=1&limit=5')

      expect(response.status).toBe(200)
      expect(response.body.vehicles).toHaveLength(5)
      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(5)
    })

    test('AC-1.2: page 2 returns next set of results', async () => {
      const page1 = await request(app).get('/api/vehicles?page=1&limit=5')
      const page2 = await request(app).get('/api/vehicles?page=2&limit=5')

      expect(page1.body.vehicles).toHaveLength(5)
      expect(page2.body.vehicles).toHaveLength(5)

      // Pages should have different vehicles
      const page1Ids = page1.body.vehicles.map(v => v.id)
      const page2Ids = page2.body.vehicles.map(v => v.id)
      expect(page1Ids).not.toEqual(page2Ids)
    })

    test('AC-1.3: last page returns remaining vehicles', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=3&limit=5')

      expect(response.body.vehicles).toHaveLength(2) // 12 total, 2 remaining
    })
  })

  // ============================================
  // AC-2: Response format
  // ============================================
  describe('AC-2: Response Format', () => {

    test('AC-2.1: response includes all required fields', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=1&limit=10')

      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('page')
      expect(response.body).toHaveProperty('limit')
      expect(response.body).toHaveProperty('vehicles')
      expect(response.body).toHaveProperty('totalPages')
    })

    test('AC-2.2: total reflects all matching vehicles', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=1&limit=5')

      expect(response.body.total).toBe(12)
      expect(response.body.totalPages).toBe(3)
    })
  })

  // ============================================
  // AC-3: Filters
  // ============================================
  describe('AC-3: Filters', () => {

    test('AC-3.1: filter by brand', async () => {
      const response = await request(app)
        .get('/api/vehicles?brand=BMW&page=1&limit=10')

      expect(response.body.total).toBe(2)
      response.body.vehicles.forEach(v => {
        expect(v.brand.toLowerCase()).toContain('bmw')
      })
    })

    test('AC-3.2: filter by minPrice', async () => {
      const response = await request(app)
        .get('/api/vehicles?minPrice=30000&page=1&limit=10')

      response.body.vehicles.forEach(v => {
        expect(v.price).toBeGreaterThanOrEqual(30000)
      })
    })

    test('AC-3.3: filter by maxPrice', async () => {
      const response = await request(app)
        .get('/api/vehicles?maxPrice=25000&page=1&limit=10')

      response.body.vehicles.forEach(v => {
        expect(v.price).toBeLessThanOrEqual(25000)
      })
    })

    test('AC-3.4: filter by price range', async () => {
      const response = await request(app)
        .get('/api/vehicles?minPrice=25000&maxPrice=35000&page=1&limit=10')

      response.body.vehicles.forEach(v => {
        expect(v.price).toBeGreaterThanOrEqual(25000)
        expect(v.price).toBeLessThanOrEqual(35000)
      })
    })

    test('AC-3.5: filter by year range', async () => {
      const response = await request(app)
        .get('/api/vehicles?minYear=2020&maxYear=2021&page=1&limit=10')

      response.body.vehicles.forEach(v => {
        expect(v.year).toBeGreaterThanOrEqual(2020)
        expect(v.year).toBeLessThanOrEqual(2021)
      })
    })

    test('AC-3.6: combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/vehicles?brand=BMW&minYear=2019&page=1&limit=10')

      expect(response.body.total).toBe(2)
      response.body.vehicles.forEach(v => {
        expect(v.brand).toBe('BMW')
        expect(v.year).toBeGreaterThanOrEqual(2019)
      })
    })
  })

  // ============================================
  // AC-4: Sorting
  // ============================================
  describe('AC-4: Sorting', () => {

    test('AC-4.1: sort by price ascending', async () => {
      const response = await request(app)
        .get('/api/vehicles?sortBy=price&order=asc&page=1&limit=12')

      const prices = response.body.vehicles.map(v => v.price)
      const sorted = [...prices].sort((a, b) => a - b)
      expect(prices).toEqual(sorted)
    })

    test('AC-4.2: sort by price descending', async () => {
      const response = await request(app)
        .get('/api/vehicles?sortBy=price&order=desc&page=1&limit=12')

      const prices = response.body.vehicles.map(v => v.price)
      const sorted = [...prices].sort((a, b) => b - a)
      expect(prices).toEqual(sorted)
    })

    test('AC-4.3: sort by year', async () => {
      const response = await request(app)
        .get('/api/vehicles?sortBy=year&order=desc&page=1&limit=12')

      const years = response.body.vehicles.map(v => v.year)
      const sorted = [...years].sort((a, b) => b - a)
      expect(years).toEqual(sorted)
    })

    test('AC-4.4: sort by mileage', async () => {
      const response = await request(app)
        .get('/api/vehicles?sortBy=mileage&order=asc&page=1&limit=12')

      const mileages = response.body.vehicles.map(v => v.mileage)
      const sorted = [...mileages].sort((a, b) => a - b)
      expect(mileages).toEqual(sorted)
    })
  })

  // ============================================
  // AC-5: Defaults
  // ============================================
  describe('AC-5: Defaults', () => {

    test('AC-5.1: default page is 1', async () => {
      const response = await request(app)
        .get('/api/vehicles?limit=5')

      expect(response.body.page).toBe(1)
    })

    test('AC-5.2: default limit is 10', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=1')

      expect(response.body.limit).toBe(10)
    })

    test('AC-5.3: limit is capped at 100', async () => {
      const response = await request(app)
        .get('/api/vehicles?limit=500&page=1')

      expect(response.body.limit).toBe(100)
    })

    test('AC-5.4: invalid page defaults to 1', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=-5&limit=10')

      expect(response.body.page).toBe(1)
    })

    test('AC-5.5: backwards compatible - no params returns array', async () => {
      const response = await request(app)
        .get('/api/vehicles')

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(12)
    })
  })
})
