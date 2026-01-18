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
app.get('/api/vehicles', (req, res) => {
  res.json(vehicles)
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
