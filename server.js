import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

// Routes
import authRoutes from './routes/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

// Auth Routes (KAN-2)
app.use('/api/auth', authRoutes)

// Temporary in-memory storage
const vehicles = []

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = req.path.includes('/admin') 
      ? '../uploads/AdminUploads'
      : '../uploads/CustomerUploads'
    cb(null, path.join(__dirname, uploadPath))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

// API Routes

/**
 * Vehicle Filter & Search API (KFZ-29)
 *
 * Query Parameters:
 * - marke: Filter by brand (exact match)
 * - preis_min/preis_max: Price range filter
 * - baujahr_min/baujahr_max: Year range filter
 * - km_min/km_max: Mileage range filter
 * - kraftstoff: Fuel type filter
 * - q: Full-text search across title/description
 * - sort: Sorting field (preis, baujahr, km, created_at)
 * - order: Sort order (asc, desc)
 */
app.get('/api/vehicles', (req, res) => {
  let result = [...vehicles]

  const {
    marke,
    preis_min, preis_max,
    baujahr_min, baujahr_max,
    km_min, km_max,
    kraftstoff,
    q,
    sort,
    order
  } = req.query

  // AC-1: Filter by brand
  if (marke) {
    result = result.filter(v => v.marke === marke)
  }

  // AC-2: Filter by price range
  // BUG 1: Off-by-one error - verwendet > statt >= für preis_min
  if (preis_min) {
    result = result.filter(v => v.preis > parseInt(preis_min)) // BUG: sollte >= sein
  }
  if (preis_max) {
    result = result.filter(v => v.preis <= parseInt(preis_max))
  }

  // AC-3: Filter by year range
  if (baujahr_min) {
    result = result.filter(v => v.baujahr >= parseInt(baujahr_min))
  }
  if (baujahr_max) {
    result = result.filter(v => v.baujahr <= parseInt(baujahr_max))
  }

  // AC-4: Filter by mileage range
  // BUG 2: Parameter-Vertauschung - km_min und km_max sind vertauscht
  if (km_min) {
    result = result.filter(v => v.kilometerstand <= parseInt(km_min)) // BUG: sollte >= sein
  }
  if (km_max) {
    result = result.filter(v => v.kilometerstand >= parseInt(km_max)) // BUG: sollte <= sein
  }

  // AC-5: Filter by fuel type
  if (kraftstoff) {
    result = result.filter(v => v.kraftstoff === kraftstoff)
  }

  // AC-6: Full-text search
  // BUG 3: Case-sensitive Suche - sollte case-insensitive sein
  if (q) {
    result = result.filter(v =>
      (v.titel && v.titel.includes(q)) || // BUG: sollte toLowerCase() verwenden
      (v.beschreibung && v.beschreibung.includes(q))
    )
  }

  // AC-7 & AC-8: Sorting
  if (sort) {
    const sortOrder = order === 'desc' ? -1 : 1

    result.sort((a, b) => {
      // BUG 4: Sortierung nach created_at fehlt komplett
      if (sort === 'preis') {
        return (a.preis - b.preis) * sortOrder
      }
      if (sort === 'baujahr') {
        // BUG 5: Sortierung ist invertiert für baujahr
        return (a.baujahr - b.baujahr) * -sortOrder // BUG: * -sortOrder statt * sortOrder
      }
      if (sort === 'km') {
        return (a.kilometerstand - b.kilometerstand) * sortOrder
      }
      return 0
    })
  }

  res.json(result)
})

app.post('/api/vehicles', upload.array('images', 5), (req, res) => {
  const vehicle = {
    id: Date.now().toString(),
    ...req.body,
    images: req.files.map(file => file.filename)
  }
  vehicles.push(vehicle)
  res.status(201).json(vehicle)
})

app.post('/api/inquiries', (req, res) => {
  // Handle vehicle inquiries
  res.status(201).json({ message: 'Inquiry received' })
})

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}

export default app
