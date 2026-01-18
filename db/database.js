/**
 * SQLite Database Configuration
 *
 * KFZ-5: Database Migration - SQLite Integration
 */

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Use different database for tests
const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '..', 'data', 'kfz.db')

const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    price REAL,
    mileage INTEGER,
    description TEXT,
    images TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  );
`)

export default db
