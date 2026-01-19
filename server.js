import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

// Routes
import authRoutes from './routes/auth.js'
import vehicleRoutes from './routes/vehicles.js' // KFZ-28: Vehicle CRUD API

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

// Auth Routes (KAN-2)
app.use('/api/auth', authRoutes)

// Vehicle Routes (KFZ-28)
app.use('/api/vehicles', vehicleRoutes)

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
