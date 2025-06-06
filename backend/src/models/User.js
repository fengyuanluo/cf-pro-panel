const { db } = require('../database/init');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { username, password, email, role = 'user' } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const stmt = db.prepare(`INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)`);
      const result = stmt.run(username, hashedPassword, email, role);
      return { id: result.lastInsertRowid, username, email, role };
    } catch (error) {
      throw error;
    }
  }

  static async findByUsername(username) {
    try {
      const stmt = db.prepare(`SELECT * FROM users WHERE username = ?`);
      return stmt.get(username);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
      return stmt.get(id);
    } catch (error) {
      throw error;
    }
  }

  static async findAll() {
    try {
      const stmt = db.prepare(`SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC`);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const stmt = db.prepare(`UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      const result = stmt.run(status, id);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(id, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const stmt = db.prepare(`UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      const result = stmt.run(hashedPassword, id);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
