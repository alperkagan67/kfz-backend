import express from 'express'
import cors from 'cors'

// Routes
import authRoutes from './routes/auth.js'
import vehicleRoutes from './routes/vehicles.js'
// Seeding
import { seedUsers } from './scripts/seed.js'

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

// Auth Routes (KAN-2)
app.use('/api/auth', authRoutes)

// Vehicle Routes (KFZ-5, KFZ-6)
app.use('/api/vehicles', vehicleRoutes)

// Inquiry endpoint
app.post('/api/inquiries', (req, res) => {
  res.status(201).json({ message: 'Inquiry received' })
})

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  // Seed test users on startup (for development)
  seedUsers().then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`)
      console.log('Test users: admin@test.com / test123')
    })
  })
}

export default app
