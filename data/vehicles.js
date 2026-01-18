/**
 * Vehicle Data Access Layer
 *
 * KFZ-5: SQLite Integration
 * Provides vehicle CRUD operations with SQLite backend.
 */

import db from '../db/database.js'

// Prepared statements
const insertVehicleStmt = db.prepare(`
  INSERT INTO vehicles (id, brand, model, year, price, mileage, description, images, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const findByIdStmt = db.prepare(`
  SELECT * FROM vehicles WHERE id = ?
`)

const getAllVehiclesStmt = db.prepare(`
  SELECT * FROM vehicles ORDER BY createdAt DESC
`)

const updateVehicleStmt = db.prepare(`
  UPDATE vehicles
  SET brand = @brand, model = @model, year = @year, price = @price,
      mileage = @mileage, description = @description, images = @images, updatedAt = @updatedAt
  WHERE id = @id
`)

const deleteVehicleStmt = db.prepare(`
  DELETE FROM vehicles WHERE id = ?
`)

const deleteAllVehiclesStmt = db.prepare(`
  DELETE FROM vehicles
`)

export function getAllVehicles() {
  const vehicles = getAllVehiclesStmt.all()
  return vehicles.map(v => ({
    ...v,
    images: v.images ? JSON.parse(v.images) : []
  }))
}

/**
 * Get paginated and filtered vehicles
 * KFZ-13: Pagination & Filter API
 */
export function getVehiclesPaginated(options = {}) {
  const {
    page = 1,
    limit = 10,
    brand,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    sortBy = 'createdAt',
    order = 'desc'
  } = options

  // Validate and cap limit
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), 100)
  const safePage = Math.max(1, parseInt(page) || 1)
  const offset = (safePage - 1) * safeLimit

  // Build WHERE clause dynamically
  const conditions = []
  const params = []

  if (brand) {
    conditions.push('LOWER(brand) LIKE LOWER(?)')
    params.push(`%${brand}%`)
  }
  if (minPrice !== undefined) {
    conditions.push('price >= ?')
    params.push(parseFloat(minPrice))
  }
  if (maxPrice !== undefined) {
    conditions.push('price <= ?')
    params.push(parseFloat(maxPrice))
  }
  if (minYear !== undefined) {
    conditions.push('year >= ?')
    params.push(parseInt(minYear))
  }
  if (maxYear !== undefined) {
    conditions.push('year <= ?')
    params.push(parseInt(maxYear))
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Validate sort column
  const validSortColumns = ['createdAt', 'price', 'year', 'mileage', 'brand', 'model']
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'createdAt'
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM vehicles ${whereClause}`
  const countResult = db.prepare(countQuery).get(...params)
  const total = countResult.total

  // Get paginated results
  const dataQuery = `
    SELECT * FROM vehicles
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeOrder}
    LIMIT ? OFFSET ?
  `
  const vehicles = db.prepare(dataQuery).all(...params, safeLimit, offset)

  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    vehicles: vehicles.map(v => ({
      ...v,
      images: v.images ? JSON.parse(v.images) : []
    }))
  }
}

export function getVehicleById(id) {
  const vehicle = findByIdStmt.get(id)
  if (vehicle) {
    vehicle.images = vehicle.images ? JSON.parse(vehicle.images) : []
  }
  return vehicle
}

export function addVehicle(vehicle) {
  const createdAt = new Date().toISOString()
  insertVehicleStmt.run(
    vehicle.id,
    vehicle.brand,
    vehicle.model,
    vehicle.year ?? null,
    vehicle.price ?? null,
    vehicle.mileage ?? null,
    vehicle.description ?? null,
    JSON.stringify(vehicle.images || []),
    createdAt
  )
  return { ...vehicle, createdAt }
}

export function updateVehicle(id, updates) {
  const existing = getVehicleById(id)
  if (!existing) return null

  const vehicleData = {
    id,
    brand: updates.brand ?? existing.brand,
    model: updates.model ?? existing.model,
    year: updates.year ?? existing.year,
    price: updates.price ?? existing.price,
    mileage: updates.mileage ?? existing.mileage,
    description: updates.description ?? existing.description,
    images: JSON.stringify(updates.images ?? existing.images),
    updatedAt: new Date().toISOString()
  }
  updateVehicleStmt.run(vehicleData)
  return getVehicleById(id)
}

export function deleteVehicle(id) {
  const existing = getVehicleById(id)
  if (!existing) return false
  deleteVehicleStmt.run(id)
  return true
}

export function clearVehicles() {
  deleteAllVehiclesStmt.run()
}

export default {
  getAllVehicles,
  getVehiclesPaginated,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  clearVehicles
}
