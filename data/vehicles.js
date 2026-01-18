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
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  clearVehicles
}
