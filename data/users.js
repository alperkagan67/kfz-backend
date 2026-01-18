/**
 * Centralized User Storage
 *
 * In-memory user storage for development.
 * In production, this would be replaced with a database.
 */

// In-memory user storage
const users = []

export function getUsers() {
  return users
}

export function addUser(user) {
  users.push(user)
  return user
}

export function findUserByEmail(email) {
  return users.find(u => u.email === email.toLowerCase())
}

export function findUserById(id) {
  return users.find(u => u.id === id)
}

export function clearUsers() {
  users.length = 0
}

export default {
  getUsers,
  addUser,
  findUserByEmail,
  findUserById,
  clearUsers
}
