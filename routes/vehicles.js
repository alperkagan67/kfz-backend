/**
 * Vehicle Routes
 *
 * KFZ-6: Vehicle CRUD - Update & Delete Operations
 * @module routes/vehicles
 *
 * Endpoints:
 * - GET    /api/vehicles      - List all vehicles
 * - GET    /api/vehicles/:id  - Get single vehicle
 * - POST   /api/vehicles      - Create vehicle
 * - PUT    /api/vehicles/:id  - Update vehicle
 * - DELETE /api/vehicles/:id  - Delete vehicle
 */

import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  getAllVehicles,
  getVehiclesPaginated,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle
} from '../data/vehicles.js'
import { authenticateToken } from './auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads', 'vehicles'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

/**
 * GET /api/vehicles
 * List vehicles with optional pagination and filters
 * KFZ-13: Pagination & Filter API
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - brand: Filter by brand (partial match)
 * - minPrice, maxPrice: Price range filter
 * - minYear, maxYear: Year range filter
 * - sortBy: Sort column (createdAt, price, year, mileage)
 * - order: Sort order (asc, desc)
 */
router.get('/', (req, res) => {
  const { page, limit, brand, minPrice, maxPrice, minYear, maxYear, sortBy, order } = req.query

  // If no pagination params, return all (backwards compatible)
  if (!page && !limit && !brand && !minPrice && !maxPrice && !minYear && !maxYear) {
    const vehicles = getAllVehicles()
    return res.json(vehicles)
  }

  // Return paginated results
  const result = getVehiclesPaginated({
    page,
    limit,
    brand,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    sortBy,
    order
  })

  res.json(result)
})

/**
 * GET /api/vehicles/:id
 * Get a single vehicle by ID
 */
router.get('/:id', (req, res) => {
  const vehicle = getVehicleById(req.params.id)

  if (!vehicle) {
    return res.status(404).json({
      error: 'Nicht gefunden',
      message: 'Fahrzeug nicht gefunden'
    })
  }

  res.json(vehicle)
})

/**
 * POST /api/vehicles
 * Create a new vehicle
 */
router.post('/', upload.array('images', 5), (req, res) => {
  const { brand, model, year, price, mileage, description } = req.body

  if (!brand || !model) {
    return res.status(400).json({
      error: 'Validierungsfehler',
      message: 'Marke und Modell sind erforderlich'
    })
  }

  const vehicle = addVehicle({
    id: Date.now().toString(),
    brand,
    model,
    year: year ? parseInt(year, 10) : null,
    price: price ? parseFloat(price) : null,
    mileage: mileage ? parseInt(mileage, 10) : null,
    description: description || null,
    images: req.files ? req.files.map(file => file.filename) : []
  })

  res.status(201).json(vehicle)
})

/**
 * PUT /api/vehicles/:id
 * Update a vehicle
 */
router.put('/:id', authenticateToken, upload.array('images', 5), (req, res) => {
  const { id } = req.params
  const { brand, model, year, price, mileage, description } = req.body

  const existing = getVehicleById(id)
  if (!existing) {
    return res.status(404).json({
      error: 'Nicht gefunden',
      message: 'Fahrzeug nicht gefunden'
    })
  }

  const updates = {}
  if (brand !== undefined) updates.brand = brand
  if (model !== undefined) updates.model = model
  if (year !== undefined) updates.year = year ? parseInt(year, 10) : null
  if (price !== undefined) updates.price = price ? parseFloat(price) : null
  if (mileage !== undefined) updates.mileage = mileage ? parseInt(mileage, 10) : null
  if (description !== undefined) updates.description = description
  if (req.files && req.files.length > 0) {
    updates.images = req.files.map(file => file.filename)
  }

  const updated = updateVehicle(id, updates)
  res.json(updated)
})

/**
 * DELETE /api/vehicles/:id
 * Delete a vehicle (Admin only)
 */
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params

  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Zugriff verweigert',
      message: 'Nur Admins können Fahrzeuge löschen'
    })
  }

  const existing = getVehicleById(id)
  if (!existing) {
    return res.status(404).json({
      error: 'Nicht gefunden',
      message: 'Fahrzeug nicht gefunden'
    })
  }

  deleteVehicle(id)
  res.json({ message: 'Fahrzeug erfolgreich gelöscht' })
})

export default router
