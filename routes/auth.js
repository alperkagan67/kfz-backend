/**
 * Authentication Routes
 *
 * KAN-2: User Authentication API
 * @module routes/auth
 *
 * Endpoints:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login    - Login user
 * - POST /api/auth/logout   - Logout user
 * - GET  /api/auth/me       - Get current user
 */

import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getUsers, addUser, findUserByEmail, findUserById } from '../data/users.js'

const router = express.Router()

// JWT Secret (should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || 'kfz-handelsplattform-secret-key-2025'
const JWT_EXPIRES_IN = '24h'

// Rate limiting storage
const loginAttempts = new Map()
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_TIME = 60 * 1000 // 1 minute

/**
 * Middleware: Authenticate JWT Token
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Zugriff verweigert',
      message: 'Kein Token vorhanden'
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({
      error: 'Ungültiger Token',
      message: 'Token ist abgelaufen oder ungültig'
    })
  }
}

/**
 * Helper: Check rate limiting
 */
const checkRateLimit = (email) => {
  const attempts = loginAttempts.get(email)
  if (!attempts) return { allowed: true }

  const now = Date.now()
  if (attempts.count >= MAX_LOGIN_ATTEMPTS && now - attempts.lastAttempt < LOCKOUT_TIME) {
    const waitTime = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 1000)
    return {
      allowed: false,
      waitTime,
      message: `Zu viele Versuche. Bitte warten Sie ${waitTime} Sekunden.`
    }
  }

  // Reset if lockout time passed
  if (now - attempts.lastAttempt >= LOCKOUT_TIME) {
    loginAttempts.delete(email)
    return { allowed: true }
  }

  return { allowed: true }
}

/**
 * Helper: Record login attempt
 */
const recordLoginAttempt = (email, success) => {
  if (success) {
    loginAttempts.delete(email)
    return
  }

  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 }
  loginAttempts.set(email, {
    count: attempts.count + 1,
    lastAttempt: Date.now()
  })
}

/**
 * Helper: Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Helper: Validate password strength
 */
const isValidPassword = (password) => {
  // Minimum 8 characters
  return password && password.length >= 8
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validierungsfehler',
        message: 'Email und Passwort sind erforderlich'
      })
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Validierungsfehler',
        message: 'Ungültiges Email-Format'
      })
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: 'Validierungsfehler',
        message: 'Passwort muss mindestens 8 Zeichen lang sein'
      })
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email)
    if (existingUser) {
      return res.status(409).json({
        error: 'Registrierung fehlgeschlagen',
        message: 'Ein Benutzer mit dieser Email existiert bereits'
      })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const user = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || '',
      role: 'user',
      createdAt: new Date().toISOString()
    }

    addUser(user)

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // Return success (without password)
    res.status(201).json({
      message: 'Registrierung erfolgreich',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    })

  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({
      error: 'Serverfehler',
      message: 'Ein unerwarteter Fehler ist aufgetreten'
    })
  }
})

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validierungsfehler',
        message: 'Email und Passwort sind erforderlich'
      })
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(email.toLowerCase())
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Zu viele Anfragen',
        message: rateLimit.message
      })
    }

    // Find user
    const user = findUserByEmail(email)
    if (!user) {
      recordLoginAttempt(email.toLowerCase(), false)
      return res.status(401).json({
        error: 'Login fehlgeschlagen',
        message: 'Email oder Passwort ist falsch'
      })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      recordLoginAttempt(email.toLowerCase(), false)
      return res.status(401).json({
        error: 'Login fehlgeschlagen',
        message: 'Email oder Passwort ist falsch'
      })
    }

    // Record successful login
    recordLoginAttempt(email.toLowerCase(), true)

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // Return success
    res.json({
      message: 'Login erfolgreich',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    })

  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({
      error: 'Serverfehler',
      message: 'Ein unerwarteter Fehler ist aufgetreten'
    })
  }
})

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authenticateToken, (req, res) => {
  // In a real app, you might blacklist the token here
  res.json({
    message: 'Logout erfolgreich'
  })
})

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateToken, (req, res) => {
  const user = findUserById(req.user.userId)

  if (!user) {
    return res.status(404).json({
      error: 'Benutzer nicht gefunden',
      message: 'Der Benutzer existiert nicht mehr'
    })
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }
  })
})

export default router
