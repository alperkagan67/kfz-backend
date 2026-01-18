/**
 * Inquiry Data Access Layer
 *
 * KFZ-15: Customer Inquiry System
 * Provides inquiry CRUD operations with SQLite backend.
 */

import db from '../db/database.js'

// Create inquiries table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    createdAt TEXT NOT NULL,
    updatedAt TEXT,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
  )
`)

// Prepared statements
const insertInquiryStmt = db.prepare(`
  INSERT INTO inquiries (id, vehicleId, name, email, phone, message, status, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const findByIdStmt = db.prepare(`
  SELECT * FROM inquiries WHERE id = ?
`)

const getAllInquiriesStmt = db.prepare(`
  SELECT i.*, v.brand, v.model
  FROM inquiries i
  LEFT JOIN vehicles v ON i.vehicleId = v.id
  ORDER BY i.createdAt DESC
`)

const updateInquiryStmt = db.prepare(`
  UPDATE inquiries
  SET status = ?, updatedAt = ?
  WHERE id = ?
`)

const deleteInquiryStmt = db.prepare(`
  DELETE FROM inquiries WHERE id = ?
`)

const deleteAllInquiriesStmt = db.prepare(`
  DELETE FROM inquiries
`)

/**
 * Get all inquiries with optional filters
 */
export function getAllInquiries(options = {}) {
  const { status, limit = 50, page = 1 } = options

  let sql = `
    SELECT i.*, v.brand, v.model
    FROM inquiries i
    LEFT JOIN vehicles v ON i.vehicleId = v.id
  `
  const params = []

  if (status) {
    sql += ' WHERE i.status = ?'
    params.push(status)
  }

  sql += ' ORDER BY i.createdAt DESC'

  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100)
  const safePage = Math.max(1, parseInt(page) || 1)
  const offset = (safePage - 1) * safeLimit

  sql += ` LIMIT ? OFFSET ?`
  params.push(safeLimit, offset)

  const inquiries = db.prepare(sql).all(...params)

  // Get total count
  let countSql = 'SELECT COUNT(*) as count FROM inquiries'
  const countParams = []
  if (status) {
    countSql += ' WHERE status = ?'
    countParams.push(status)
  }
  const { count: total } = db.prepare(countSql).get(...countParams)

  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    inquiries
  }
}

/**
 * Get inquiry by ID
 */
export function getInquiryById(id) {
  return findByIdStmt.get(id)
}

/**
 * Add a new inquiry
 */
export function addInquiry(inquiry) {
  const { id, vehicleId, name, email, phone, message } = inquiry
  const createdAt = new Date().toISOString()
  const status = 'new'

  insertInquiryStmt.run(id, vehicleId, name, email, phone || null, message, status, createdAt)

  return {
    id,
    vehicleId,
    name,
    email,
    phone: phone || null,
    message,
    status,
    createdAt
  }
}

/**
 * Update inquiry status
 */
export function updateInquiryStatus(id, newStatus) {
  const updatedAt = new Date().toISOString()
  const result = updateInquiryStmt.run(newStatus, updatedAt, id)

  if (result.changes === 0) {
    return null
  }

  return getInquiryById(id)
}

/**
 * Delete an inquiry
 */
export function deleteInquiry(id) {
  const result = deleteInquiryStmt.run(id)
  return result.changes > 0
}

/**
 * Clear all inquiries (for testing)
 */
export function clearInquiries() {
  deleteAllInquiriesStmt.run()
}

/**
 * Get inquiries by vehicle ID
 */
export function getInquiriesByVehicle(vehicleId) {
  const stmt = db.prepare(`
    SELECT * FROM inquiries WHERE vehicleId = ? ORDER BY createdAt DESC
  `)
  return stmt.all(vehicleId)
}

/**
 * Count inquiries by status
 */
export function countInquiriesByStatus() {
  const stmt = db.prepare(`
    SELECT status, COUNT(*) as count FROM inquiries GROUP BY status
  `)
  const results = stmt.all()

  const counts = { new: 0, contacted: 0, closed: 0 }
  results.forEach(r => {
    counts[r.status] = r.count
  })

  return counts
}
