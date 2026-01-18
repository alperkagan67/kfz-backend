/**
 * User Data Access Layer
 *
 * KFZ-5: SQLite Integration
 * Provides user CRUD operations with SQLite backend.
 */

import db from '../db/database.js'

// Prepared statements for performance
const insertUserStmt = db.prepare(`
  INSERT INTO users (id, email, password, name, role, createdAt)
  VALUES (@id, @email, @password, @name, @role, @createdAt)
`)

const findByEmailStmt = db.prepare(`
  SELECT * FROM users WHERE LOWER(email) = LOWER(?)
`)

const findByIdStmt = db.prepare(`
  SELECT * FROM users WHERE id = ?
`)

const getAllUsersStmt = db.prepare(`
  SELECT * FROM users
`)

const deleteAllUsersStmt = db.prepare(`
  DELETE FROM users
`)

export function getUsers() {
  return getAllUsersStmt.all()
}

export function addUser(user) {
  insertUserStmt.run(user)
  return user
}

export function findUserByEmail(email) {
  return findByEmailStmt.get(email.toLowerCase())
}

export function findUserById(id) {
  return findByIdStmt.get(id)
}

export function clearUsers() {
  deleteAllUsersStmt.run()
}

export default {
  getUsers,
  addUser,
  findUserByEmail,
  findUserById,
  clearUsers
}
