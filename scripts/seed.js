/**
 * Database Seeding Script
 *
 * KAN-4: Backend User Seeding
 *
 * Creates test users for development and testing purposes.
 * Run with: npm run seed
 */

import bcrypt from 'bcryptjs'
import { getUsers, addUser } from '../data/users.js'

const SEED_USERS = [
  {
    email: 'admin@test.com',
    password: 'test123',
    name: 'Test Admin',
    role: 'admin'
  },
  {
    email: 'user@test.com',
    password: 'test123',
    name: 'Test User',
    role: 'user'
  }
]

export async function seedUsers() {
  const users = getUsers()
  const results = {
    created: [],
    skipped: [],
    errors: []
  }

  for (const seedUser of SEED_USERS) {
    try {
      // Check if user already exists (idempotent)
      const existingUser = users.find(u => u.email.toLowerCase() === seedUser.email.toLowerCase())

      if (existingUser) {
        results.skipped.push(seedUser.email)
        console.log(`[SKIP] User ${seedUser.email} already exists`)
        continue
      }

      // Hash password with bcrypt
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(seedUser.password, saltRounds)

      // Create user object
      const user = {
        id: `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: seedUser.email.toLowerCase(),
        password: hashedPassword,
        name: seedUser.name,
        role: seedUser.role,
        createdAt: new Date().toISOString()
      }

      // Add to users array
      addUser(user)
      results.created.push(seedUser.email)
      console.log(`[CREATE] User ${seedUser.email} created with role: ${seedUser.role}`)

    } catch (error) {
      results.errors.push({ email: seedUser.email, error: error.message })
      console.error(`[ERROR] Failed to create user ${seedUser.email}:`, error.message)
    }
  }

  return results
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('seed.js')) {
  console.log('\n=== Starting User Seeding ===\n')

  seedUsers()
    .then(results => {
      console.log('\n=== Seeding Complete ===')
      console.log(`Created: ${results.created.length}`)
      console.log(`Skipped: ${results.skipped.length}`)
      console.log(`Errors: ${results.errors.length}`)

      if (results.errors.length > 0) {
        process.exit(1)
      }
    })
    .catch(err => {
      console.error('Seeding failed:', err)
      process.exit(1)
    })
}
