const { db } = require('../database/init');

class Domain {
  static async create(domainData) {
    const { domain, cf_api_key, cf_email, max_hostnames = 100 } = domainData;

    if (!cf_email) {
      throw new Error('CF邮箱地址是必需的');
    }

    try {
      const stmt = db.prepare(`INSERT INTO domains (domain, cf_api_key, cf_email, max_hostnames) VALUES (?, ?, ?, ?)`);
      const result = stmt.run(domain, cf_api_key, cf_email, max_hostnames);
      return { id: result.lastInsertRowid, domain, cf_email, max_hostnames };
    } catch (error) {
      throw error;
    }
  }

  static async findAll() {
    try {
      const stmt = db.prepare(`SELECT id, domain, cf_email, max_hostnames, status, created_at FROM domains ORDER BY created_at DESC`);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const stmt = db.prepare(`SELECT * FROM domains WHERE id = ?`);
      return stmt.get(id);
    } catch (error) {
      throw error;
    }
  }

  static async findActive() {
    try {
      const stmt = db.prepare(`
        SELECT d.id, d.domain, d.max_hostnames,
               COUNT(ch.id) as current_hostnames
        FROM domains d
        LEFT JOIN custom_hostnames ch ON d.id = ch.domain_id
        WHERE d.status = 'active'
        GROUP BY d.id, d.domain, d.max_hostnames
        HAVING COUNT(ch.id) < d.max_hostnames
        ORDER BY d.domain
      `);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const stmt = db.prepare(`UPDATE domains SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      const result = stmt.run(status, id);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const stmt = db.prepare(`DELETE FROM domains WHERE id = ?`);
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  // 生成6位随机字母组合
  static generateRandomPrefix() {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
  }

  // 生成唯一的子域名前缀
  static async generateUniqueSubdomainPrefix(domainId) {
    try {
      let prefix;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 100; // 防止无限循环

      while (!isUnique && attempts < maxAttempts) {
        prefix = this.generateRandomPrefix();

        // 检查是否已存在
        const stmt = db.prepare(`SELECT COUNT(*) as count FROM custom_hostnames WHERE domain_id = ? AND subdomain_prefix = ?`);
        const row = stmt.get(domainId, prefix);

        if (row.count === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('无法生成唯一的子域名前缀，请重试');
      }

      return prefix;
    } catch (error) {
      throw error;
    }
  }

  static async checkHostnameLimit(domainId) {
    try {
      const stmt = db.prepare(`
        SELECT d.max_hostnames, COUNT(ch.id) as current_hostnames
        FROM domains d
        LEFT JOIN custom_hostnames ch ON d.id = ch.domain_id
        WHERE d.id = ?
        GROUP BY d.id, d.max_hostnames
      `);
      const result = stmt.get(domainId);

      if (!result) {
        throw new Error('域名不存在');
      }

      return {
        max_hostnames: result.max_hostnames,
        current_hostnames: result.current_hostnames || 0,
        can_add: (result.current_hostnames || 0) < result.max_hostnames
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Domain;
