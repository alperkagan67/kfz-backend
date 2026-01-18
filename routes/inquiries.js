/**
 * Inquiry Routes
 *
 * KFZ-15: Customer Inquiry System
 * @module routes/inquiries
 *
 * Endpoints:
 * - POST   /api/inquiries         - Create inquiry (public)
 * - GET    /api/inquiries         - List inquiries (admin only)
 * - GET    /api/inquiries/:id     - Get single inquiry (admin only)
 * - PUT    /api/inquiries/:id     - Update inquiry status (admin only)
 * - DELETE /api/inquiries/:id     - Delete inquiry (admin only)
 */

import express from 'express'
import {
  getAllInquiries,
  getInquiryById,
  addInquiry,
  updateInquiryStatus,
  deleteInquiry,
  countInquiriesByStatus
} from '../data/inquiries.js'
import { getVehicleById } from '../data/vehicles.js'
import { authenticateToken } from './auth.js'

const router = express.Router()

/**
 * POST /api/inquiries
 * Create a new inquiry (public endpoint)
 */
router.post('/', async (req, res) => {
  const { vehicleId, name, email, phone, message } = req.body

  // Validation
  const errors = []

  if (!vehicleId) {
    errors.push('vehicleId ist erforderlich')
  } else {
    // Check if vehicle exists
    const vehicle = getVehicleById(vehicleId)
    if (!vehicle) {
      errors.push('Fahrzeug nicht gefunden')
    }
  }

  if (!name || !name.trim()) {
    errors.push('Name ist erforderlich')
  }

  if (!email || !email.trim()) {
    errors.push('Email ist erforderlich')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Ungueltige Email-Adresse')
  }

  if (!message || !message.trim()) {
    errors.push('Nachricht ist erforderlich')
  } else if (message.trim().length < 10) {
    errors.push('Nachricht muss mindestens 10 Zeichen lang sein')
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validierungsfehler',
      message: errors.join(', ')
    })
  }

  try {
    const inquiry = addInquiry({
      id: Date.now().toString(),
      vehicleId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      message: message.trim()
    })

    res.status(201).json(inquiry)
  } catch (error) {
    console.error('Error creating inquiry:', error)
    res.status(500).json({
      error: 'Interner Fehler',
      message: 'Anfrage konnte nicht erstellt werden'
    })
  }
})

/**
 * GET /api/inquiries
 * List all inquiries with optional filters (admin only)
 */
router.get('/', authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Zugriff verweigert',
      message: 'Nur Admins koennen Anfragen einsehen'
    })
  }

  const { status, limit, page } = req.query

  try {
    const result = getAllInquiries({ status, limit, page })
    res.json(result)
  } catch (error) {
    console.error('Error fetching inquiries:', error)
    res.status(500).json({
      error: 'Interner Fehler',
      message: 'Anfragen konnten nicht geladen werden'
    })
  }
})

/**
 * GET /api/inquiries/stats
 * Get inquiry counts by status (admin only)
 */
router.get('/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Zugriff verweigert',
      message: 'Nur Admins koennen Statistiken einsehen'
    })
  }

  try {
    const counts = countInquiriesByStatus()
    res.json(counts)
  } catch (error) {
    console.error('Error fetching inquiry stats:', error)
    res.status(500).json({
      error: 'Interner Fehler',
      message: 'Statistiken konnten nicht geladen werden'
    })
  }
})

/**
 * GET /api/inquiries/:id
 * Get a single inquiry by ID (admin only)
 */
router.get('/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Zugriff verweigert',
      message: 'Nur Admins koennen Anfragen einsehen'
    })
  }

  const inquiry = getInquiryById(req.params.id)

  if (!inquiry) {
    return res.status(404).json({
      error: 'Nicht gefunden',
      message: 'Anfrage nicht gefunden'
    })
  }

  res.json(inquiry)
})

/**
 * PUT /api/inquiries/:id
 * Update inquiry status (admin only)
 */
router.put('/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Zugriff verweigert',
      message: 'Nur Admins koennen Anfragen aktualisieren'
    })
  }

  const { id } = req.params
  const { status } = req.body

  // Validate status
  const validStatuses = ['new', 'contacted', 'closed']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Validierungsfehler',
      message: `Status muss einer von ${validStatuses.join(', ')} sein`
    })
  }

  const existing = getInquiryById(id)
  if (!existing) {
    return res.status(404).json({
      error: 'Nicht gefunden',
      message: 'Anfrage nicht gefunden'
    })
  }

  try {
    const updated = updateInquiryStatus(id, status)
    res.json(updated)
  } catch (error) {
    console.error('Error updating inquiry:', error)
    res.status(500).json({
      error: 'Interner Fehler',
      message: 'Anfrage konnte nicht aktualisiert werden'
    })
  }
})

/**
 * DELETE /api/inquiries/:id
 * Delete an inquiry (admin only)
 */
router.delete('/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Zugriff verweigert',
      message: 'Nur Admins koennen Anfragen loeschen'
    })
  }

  const { id } = req.params

  const existing = getInquiryById(id)
  if (!existing) {
    return res.status(404).json({
      error: 'Nicht gefunden',
      message: 'Anfrage nicht gefunden'
    })
  }

  try {
    deleteInquiry(id)
    res.json({ message: 'Anfrage erfolgreich geloescht' })
  } catch (error) {
    console.error('Error deleting inquiry:', error)
    res.status(500).json({
      error: 'Interner Fehler',
      message: 'Anfrage konnte nicht geloescht werden'
    })
  }
})

export default router
