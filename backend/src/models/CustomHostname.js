const { db } = require('../database/init');
const moment = require('moment');

class CustomHostname {
  static async create(hostnameData) {
    const {
      user_id,
      domain_id,
      custom_hostname,
      subdomain,
      subdomain_prefix,
      target_ip,
      record_type,
      expires_at,
      permission_id
    } = hostnameData;

    try {
      const stmt = db.prepare(`
        INSERT INTO custom_hostnames
        (user_id, domain_id, custom_hostname, subdomain, subdomain_prefix, target_ip, record_type, expires_at, permission_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(user_id, domain_id, custom_hostname, subdomain, subdomain_prefix, target_ip, record_type, expires_at, permission_id);
      return { id: result.lastInsertRowid, ...hostnameData };
    } catch (error) {
      throw error;
    }
  }

  static async findByUser(userId) {
    try {
      const stmt = db.prepare(`
        SELECT ch.*, d.domain, ud.expires_at as permission_expires_at
        FROM custom_hostnames ch
        JOIN domains d ON ch.domain_id = d.id
        LEFT JOIN user_domains ud ON ch.permission_id = ud.id
        WHERE ch.user_id = ?
        ORDER BY ch.created_at DESC
      `);
      return stmt.all(userId);
    } catch (error) {
      throw error;
    }
  }

  static async findAllWithUserInfo() {
    try {
      const stmt = db.prepare(`
        SELECT ch.*, d.domain, u.username
        FROM custom_hostnames ch
        JOIN domains d ON ch.domain_id = d.id
        JOIN users u ON ch.user_id = u.id
        ORDER BY ch.created_at DESC
      `);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  static async findByDomain(domainId) {
    try {
      const stmt = db.prepare(`
        SELECT ch.*
        FROM custom_hostnames ch
        WHERE ch.domain_id = ?
        ORDER BY ch.created_at DESC
      `);
      return stmt.all(domainId);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const stmt = db.prepare(`
        SELECT ch.*, d.domain, d.cf_api_key, d.cf_email
        FROM custom_hostnames ch
        JOIN domains d ON ch.domain_id = d.id
        WHERE ch.id = ?
      `);
      return stmt.get(id);
    } catch (error) {
      throw error;
    }
  }

  static async updateCFInfo(id, cfData) {
    console.log('updateCFInfo调用:', { id, ...cfData });

    try {
      // 构建动态更新语句，只更新提供的字段
      const updateFields = [];
      const updateValues = [];

      if (cfData.cf_hostname_id !== undefined) {
        updateFields.push('cf_hostname_id = ?');
        updateValues.push(cfData.cf_hostname_id);
      }

      if (cfData.cf_dns_record_id !== undefined) {
        updateFields.push('cf_dns_record_id = ?');
        updateValues.push(cfData.cf_dns_record_id);
      }

      if (cfData.verification_txt_name !== undefined) {
        updateFields.push('verification_txt_name = ?');
        updateValues.push(cfData.verification_txt_name);
      }

      if (cfData.verification_txt_value !== undefined) {
        updateFields.push('verification_txt_value = ?');
        updateValues.push(cfData.verification_txt_value);
      }

      if (cfData.hostname_txt_name !== undefined) {
        updateFields.push('hostname_txt_name = ?');
        updateValues.push(cfData.hostname_txt_name);
      }

      if (cfData.hostname_txt_value !== undefined) {
        updateFields.push('hostname_txt_value = ?');
        updateValues.push(cfData.hostname_txt_value);
      }

      if (updateFields.length === 0) {
        console.log('没有字段需要更新');
        return false;
      }

      const sql = `UPDATE custom_hostnames SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(id);

      console.log('执行SQL:', sql);
      console.log('参数:', updateValues);

      const stmt = db.prepare(sql);
      const result = stmt.run(...updateValues);

      console.log('updateCFInfo结果:', { changes: result.changes, lastInsertRowid: result.lastInsertRowid });

      // 验证更新是否成功
      const updated = db.prepare('SELECT cf_hostname_id, cf_dns_record_id FROM custom_hostnames WHERE id = ?').get(id);
      console.log('更新后的记录:', updated);

      return result.changes > 0;
    } catch (error) {
      console.error('updateCFInfo错误:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const stmt = db.prepare(`UPDATE custom_hostnames SET status = ? WHERE id = ?`);
      const result = stmt.run(status, id);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const stmt = db.prepare(`DELETE FROM custom_hostnames WHERE id = ?`);
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async findExpired() {
    try {
      const stmt = db.prepare(`
        SELECT ch.*, d.domain, d.cf_api_key, d.cf_email
        FROM custom_hostnames ch
        JOIN domains d ON ch.domain_id = d.id
        WHERE ch.expires_at < CURRENT_TIMESTAMP AND ch.status != 'expired'
      `);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  static async findByInactiveUsers() {
    try {
      const stmt = db.prepare(`
        SELECT ch.*, d.domain, d.cf_api_key, d.cf_email, u.username, u.status as user_status
        FROM custom_hostnames ch
        JOIN domains d ON ch.domain_id = d.id
        JOIN users u ON ch.user_id = u.id
        WHERE u.status != 'active'
      `);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  static async updateTargetIP(id, targetIp, userId) {
    try {
      const stmt = db.prepare(`UPDATE custom_hostnames SET target_ip = ? WHERE id = ? AND user_id = ?`);
      const result = stmt.run(targetIp, id, userId);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  // 查找绑定到特定权限的主机名
  static async findByPermission(permissionId) {
    try {
      const stmt = db.prepare(`
        SELECT ch.*, d.domain
        FROM custom_hostnames ch
        JOIN domains d ON ch.domain_id = d.id
        WHERE ch.permission_id = ?
        ORDER BY ch.created_at DESC
      `);
      return stmt.all(permissionId);
    } catch (error) {
      throw error;
    }
  }

  // 更新主机名的权限绑定
  static async updatePermissionBinding(hostnameId, permissionId) {
    try {
      const stmt = db.prepare(`UPDATE custom_hostnames SET permission_id = ? WHERE id = ?`);
      const result = stmt.run(permissionId, hostnameId);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  // 查找过期权限绑定的主机名
  static async findByExpiredPermissions() {
    try {
      const stmt = db.prepare(`
        SELECT ch.*, d.domain, d.cf_api_key, d.cf_email
        FROM custom_hostnames ch
        JOIN domains d ON ch.domain_id = d.id
        JOIN user_domains ud ON ch.permission_id = ud.id
        WHERE ud.expires_at <= CURRENT_TIMESTAMP AND ud.status = 'active'
      `);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CustomHostname;
