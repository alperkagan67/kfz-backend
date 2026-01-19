/**
 * KFZ-28: Vehicle CRUD API
 *
 * Vollständige REST-API für Fahrzeugverwaltung mit Filtern und Suche
 */

import express from 'express'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// In-Memory Datenbank (später durch echte DB ersetzen)
let vehicles = [
  {
    id: '1',
    marke: 'Mercedes-Benz',
    modell: 'C-Klasse AMG',
    preis: 68000,
    baujahr: 2022,
    kilometerstand: 15000,
    kraftstoff: 'benzin',
    beschreibung: 'Sportlicher AMG mit Premium-Ausstattung',
    bilder: ['/images/mercedes-c-amg.jpg'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    marke: 'BMW',
    modell: 'M4 Competition',
    preis: 89900,
    baujahr: 2022,
    kilometerstand: 15000,
    kraftstoff: 'benzin',
    beschreibung: 'BMW M4 Competition mit M Driver Package',
    bilder: ['/images/bmw-m4.jpg'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    marke: 'Audi',
    modell: 'RS e-tron GT',
    preis: 142500,
    baujahr: 2023,
    kilometerstand: 8000,
    kraftstoff: 'elektro',
    beschreibung: 'Vollelektrischer Sportwagen mit 646 PS',
    bilder: ['/images/audi-etron.jpg'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    marke: 'Porsche',
    modell: '911 GT3',
    preis: 189000,
    baujahr: 2022,
    kilometerstand: 12000,
    kraftstoff: 'benzin',
    beschreibung: 'Porsche 911 GT3 mit Clubsport-Paket',
    bilder: ['/images/porsche-gt3.jpg'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

/**
 * Validierung für Fahrzeug-Daten
 */
function validateVehicle(data, isUpdate = false) {
  const errors = []

  if (!isUpdate || data.marke !== undefined) {
    if (!data.marke || typeof data.marke !== 'string' || data.marke.length < 2) {
      errors.push('Marke muss mindestens 2 Zeichen haben')
    }
  }

  if (!isUpdate || data.modell !== undefined) {
    if (!data.modell || typeof data.modell !== 'string' || data.modell.length < 2) {
      errors.push('Modell muss mindestens 2 Zeichen haben')
    }
  }

  if (!isUpdate || data.preis !== undefined) {
    const preis = Number(data.preis)
    if (isNaN(preis) || preis < 0 || preis > 10000000) {
      errors.push('Preis muss zwischen 0 und 10.000.000 liegen')
    }
  }

  if (!isUpdate || data.baujahr !== undefined) {
    const baujahr = Number(data.baujahr)
    if (isNaN(baujahr) || baujahr < 1900 || baujahr > new Date().getFullYear() + 1) {
      errors.push('Baujahr ungültig')
    }
  }

  if (!isUpdate || data.kilometerstand !== undefined) {
    const km = Number(data.kilometerstand)
    if (isNaN(km) || km < 0 || km > 1000000) {
      errors.push('Kilometerstand muss zwischen 0 und 1.000.000 liegen')
    }
  }

  if (!isUpdate || data.kraftstoff !== undefined) {
    const validKraftstoffe = ['benzin', 'diesel', 'elektro', 'hybrid']
    if (!validKraftstoffe.includes(data.kraftstoff?.toLowerCase())) {
      errors.push('Kraftstoff muss benzin, diesel, elektro oder hybrid sein')
    }
  }

  return errors
}

/**
 * GET /api/vehicles
 * Liste aller Fahrzeuge mit Filtern, Suche und Pagination
 */
router.get('/', (req, res) => {
  let result = [...vehicles]

  // Textsuche in Marke und Modell
  if (req.query.q) {
    const searchTerm = req.query.q.toLowerCase()
    result = result.filter(v =>
      v.marke.toLowerCase().includes(searchTerm) ||
      v.modell.toLowerCase().includes(searchTerm)
    )
  }

  // Filter: Marke (kann mehrere sein, kommagetrennt)
  if (req.query.marke) {
    const marken = req.query.marke.toLowerCase().split(',')
    result = result.filter(v => marken.includes(v.marke.toLowerCase()))
  }

  // Filter: Preis-Range
  if (req.query.preis_min) {
    const min = Number(req.query.preis_min)
    result = result.filter(v => v.preis >= min)
  }
  if (req.query.preis_max) {
    const max = Number(req.query.preis_max)
    result = result.filter(v => v.preis <= max)
  }

  // Filter: Baujahr-Range
  if (req.query.baujahr_min) {
    const min = Number(req.query.baujahr_min)
    result = result.filter(v => v.baujahr >= min)
  }
  if (req.query.baujahr_max) {
    const max = Number(req.query.baujahr_max)
    result = result.filter(v => v.baujahr <= max)
  }

  // Filter: Kilometerstand-Range
  if (req.query.km_min) {
    const min = Number(req.query.km_min)
    result = result.filter(v => v.kilometerstand >= min)
  }
  if (req.query.km_max) {
    const max = Number(req.query.km_max)
    result = result.filter(v => v.kilometerstand <= max)
  }

  // Filter: Kraftstoff (kann mehrere sein, kommagetrennt)
  if (req.query.kraftstoff) {
    const kraftstoffe = req.query.kraftstoff.toLowerCase().split(',')
    result = result.filter(v => kraftstoffe.includes(v.kraftstoff.toLowerCase()))
  }

  // Sortierung
  const sortField = req.query.sort || 'createdAt'
  const sortOrder = req.query.order === 'desc' ? -1 : 1

  result.sort((a, b) => {
    if (a[sortField] < b[sortField]) return -1 * sortOrder
    if (a[sortField] > b[sortField]) return 1 * sortOrder
    return 0
  })

  // Pagination
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit

  const paginatedResult = result.slice(startIndex, endIndex)

  res.json({
    data: paginatedResult,
    pagination: {
      total: result.length,
      page,
      limit,
      totalPages: Math.ceil(result.length / limit)
    }
  })
})

/**
 * GET /api/vehicles/marken
 * Liste aller verfügbaren Marken
 */
router.get('/marken', (req, res) => {
  const marken = [...new Set(vehicles.map(v => v.marke))].sort()
  res.json(marken)
})

/**
 * GET /api/vehicles/:id
 * Einzelnes Fahrzeug abrufen
 */
router.get('/:id', (req, res) => {
  const vehicle = vehicles.find(v => v.id === req.params.id)

  if (!vehicle) {
    return res.status(404).json({ error: 'Fahrzeug nicht gefunden' })
  }

  res.json(vehicle)
})

/**
 * POST /api/vehicles
 * Neues Fahrzeug erstellen
 */
router.post('/', (req, res) => {
  const errors = validateVehicle(req.body)

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validierungsfehler', details: errors })
  }

  const vehicle = {
    id: uuidv4(),
    marke: req.body.marke,
    modell: req.body.modell,
    preis: Number(req.body.preis),
    baujahr: Number(req.body.baujahr),
    kilometerstand: Number(req.body.kilometerstand),
    kraftstoff: req.body.kraftstoff.toLowerCase(),
    beschreibung: req.body.beschreibung || '',
    bilder: req.body.bilder || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  vehicles.push(vehicle)
  res.status(201).json(vehicle)
})

/**
 * PUT /api/vehicles/:id
 * Fahrzeug aktualisieren
 */
router.put('/:id', (req, res) => {
  const index = vehicles.findIndex(v => v.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ error: 'Fahrzeug nicht gefunden' })
  }

  const errors = validateVehicle(req.body, true)

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validierungsfehler', details: errors })
  }

  const updatedVehicle = {
    ...vehicles[index],
    ...req.body,
    id: vehicles[index].id, // ID kann nicht geändert werden
    createdAt: vehicles[index].createdAt, // createdAt bleibt
    updatedAt: new Date().toISOString()
  }

  // Numerische Felder konvertieren
  if (req.body.preis !== undefined) updatedVehicle.preis = Number(req.body.preis)
  if (req.body.baujahr !== undefined) updatedVehicle.baujahr = Number(req.body.baujahr)
  if (req.body.kilometerstand !== undefined) updatedVehicle.kilometerstand = Number(req.body.kilometerstand)
  if (req.body.kraftstoff !== undefined) updatedVehicle.kraftstoff = req.body.kraftstoff.toLowerCase()

  vehicles[index] = updatedVehicle
  res.json(updatedVehicle)
})

/**
 * DELETE /api/vehicles/:id
 * Fahrzeug löschen
 */
router.delete('/:id', (req, res) => {
  const index = vehicles.findIndex(v => v.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ error: 'Fahrzeug nicht gefunden' })
  }

  const deleted = vehicles.splice(index, 1)[0]
  res.json({ message: 'Fahrzeug gelöscht', vehicle: deleted })
})

export default router
