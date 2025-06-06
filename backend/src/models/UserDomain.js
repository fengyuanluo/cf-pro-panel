const { db } = require('../database/init');
const moment = require('moment');

class UserDomain {
  static async getUserPermissions(userId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM user_domains
        WHERE user_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP
        ORDER BY expires_at DESC
      `);
      return stmt.all(userId);
    } catch (error) {
      throw error;
    }
  }

  static async getAvailableSubdomains(userId) {
    try {
      const stmt = db.prepare(`
        SELECT
          COUNT(*) as available_count,
          MIN(expires_at) as earliest_expiry
        FROM user_domains
        WHERE user_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP AND is_used = 0
      `);
      const row = stmt.get(userId);
      return {
        available_count: row?.available_count || 0,
        earliest_expiry: row?.earliest_expiry
      };
    } catch (error) {
      throw error;
    }
  }

  static async useSubdomain(userId) {
    try {
      const transaction = db.transaction(() => {
        // 找到最早过期且未使用的权限记录
        const findStmt = db.prepare(`
          SELECT * FROM user_domains
          WHERE user_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP AND is_used = 0
          ORDER BY expires_at ASC
          LIMIT 1
        `);

        const permission = findStmt.get(userId);

        if (!permission) {
          throw new Error('没有可用的子域名权限');
        }

        // 标记为已使用
        const updateStmt = db.prepare(`UPDATE user_domains SET is_used = 1 WHERE id = ?`);
        updateStmt.run(permission.id);

        return permission;
      });

      return transaction();
    } catch (error) {
      throw error;
    }
  }



  // 释放权限 - 根据权限ID释放
  static async releaseSubdomain(permissionId) {
    try {
      const transaction = db.transaction(() => {
        // 标记权限为未使用
        const updateStmt = db.prepare(`UPDATE user_domains SET is_used = 0 WHERE id = ?`);
        const result = updateStmt.run(permissionId);

        if (result.changes === 0) {
          console.warn(`权限ID ${permissionId} 不存在或已释放`);
          return false;
        }

        console.log(`已释放权限ID: ${permissionId}`);
        return true;
      });

      return transaction();
    } catch (error) {
      throw error;
    }
  }

  // 智能释放权限 - 自动找到合适的权限记录进行释放（兼容旧代码）
  static async smartReleaseSubdomain(userId) {
    try {
      const transaction = db.transaction(() => {
        // 找到已使用且未过期的权限记录，优先释放最早过期的
        const findStmt = db.prepare(`
          SELECT * FROM user_domains
          WHERE user_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP AND is_used = 1
          ORDER BY expires_at ASC
          LIMIT 1
        `);

        const permission = findStmt.get(userId);

        if (!permission) {
          console.warn(`用户 ${userId} 没有可释放的权限记录`);
          return false;
        }

        // 标记为未使用
        const updateStmt = db.prepare(`UPDATE user_domains SET is_used = 0 WHERE id = ?`);
        const result = updateStmt.run(permission.id);

        console.log(`已释放用户 ${userId} 的权限，权限ID: ${permission.id}`);
        return result.changes > 0;
      });

      return transaction();
    } catch (error) {
      throw error;
    }
  }

  static async adjustUserPermissions(userId, subdomainCount, validityDays) {
    try {
      const expiresAt = moment().add(validityDays, 'days').format('YYYY-MM-DD HH:mm:ss');
      const stmt = db.prepare(`INSERT INTO user_domains (user_id, subdomain_count, is_used, expires_at) VALUES (?, ?, ?, ?)`);

      // 创建多个单独的额度记录（一对一关系）
      const permissions = [];
      for (let i = 0; i < subdomainCount; i++) {
        const result = stmt.run(userId, 1, 0, expiresAt);
        permissions.push({
          id: result.lastInsertRowid,
          subdomain_count: 1,
          expires_at: expiresAt
        });
      }

      return permissions;
    } catch (error) {
      throw error;
    }
  }

  // 删除用户权限记录（同时删除关联的主机名）
  static async deleteUserPermission(permissionId) {
    try {
      const transaction = db.transaction(() => {
        // 检查是否有绑定的主机名
        const checkStmt = db.prepare(`SELECT id FROM custom_hostnames WHERE permission_id = ?`);
        const boundHostname = checkStmt.get(permissionId);

        if (boundHostname) {
          throw new Error('该权限已绑定主机名，请先删除主机名或联系管理员处理');
        }

        // 删除权限记录
        const deleteStmt = db.prepare(`DELETE FROM user_domains WHERE id = ?`);
        const result = deleteStmt.run(permissionId);
        return result.changes > 0;
      });

      return transaction();
    } catch (error) {
      throw error;
    }
  }

  // 获取用户权限详情（包括已过期的）
  static async getAllUserPermissions(userId) {
    try {
      const stmt = db.prepare(`
        SELECT ud.*,
               CASE WHEN ch.id IS NOT NULL THEN 1 ELSE 0 END as bound_hostnames_count,
               ch.custom_hostname as bound_hostname
        FROM user_domains ud
        LEFT JOIN custom_hostnames ch ON ud.id = ch.permission_id
        WHERE ud.user_id = ? AND ud.status = 'active'
        ORDER BY ud.expires_at DESC
      `);
      const permissions = stmt.all(userId);

      // 处理绑定的主机名信息
      return permissions.map(permission => ({
        ...permission,
        bound_hostnames: permission.bound_hostname ? [permission.bound_hostname] : [],
        available_slots: permission.is_used ? 0 : 1
      }));
    } catch (error) {
      throw error;
    }
  }

  // 获取用户统计信息
  static async getUserStats(userId) {
    try {
      const stmt = db.prepare(`
        SELECT
          COUNT(*) as total_count,
          SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END) as used_count,
          SUM(CASE WHEN is_used = 0 THEN 1 ELSE 0 END) as available_count
        FROM user_domains
        WHERE user_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP
      `);
      const stats = stmt.get(userId);

      // 确保返回的都是有效数字
      const result = {
        total_count: Number(stats?.total_count) || 0,
        used_count: Number(stats?.used_count) || 0,
        available_count: Number(stats?.available_count) || 0
      };

      console.log('用户统计查询结果:', { userId, stats, result });
      return result;
    } catch (error) {
      console.error('获取用户统计信息错误:', error);
      return { total_count: 0, used_count: 0, available_count: 0 };
    }
  }

  // 清理过期权限
  static async cleanupExpiredPermissions() {
    try {
      const stmt = db.prepare(`
        UPDATE user_domains
        SET status = 'expired'
        WHERE expires_at <= CURRENT_TIMESTAMP AND status = 'active'
      `);
      const result = stmt.run();
      console.log(`清理了 ${result.changes} 个过期权限`);
      return result.changes;
    } catch (error) {
      throw error;
    }
  }

  // 根据ID查找权限
  static async findById(permissionId) {
    try {
      const stmt = db.prepare(`SELECT * FROM user_domains WHERE id = ?`);
      return stmt.get(permissionId);
    } catch (error) {
      throw error;
    }
  }

  // 智能删除权限（处理绑定的主机名）
  static async smartDeletePermission(permissionId) {
    try {
      // 先获取绑定的主机名信息（包含CF信息）
      const checkStmt = db.prepare(`
        SELECT ch.*, d.domain, d.cf_api_key, d.cf_email
        FROM custom_hostnames ch
        JOIN domains d ON ch.domain_id = d.id
        WHERE ch.permission_id = ?
      `);
      const boundHostnames = checkStmt.all(permissionId);

      const result = {
        migrated_hostnames: [],
        deleted_hostnames: []
      };

      // 处理需要删除CF资源的主机名
      const CloudflareService = require('../services/CloudflareService');
      const hostnamesNeedingCFDeletion = [];

      const transaction = db.transaction(() => {
        if (boundHostnames.length > 0) {
          // 对于每个绑定的主机名，尝试迁移到其他可用权限或删除
          for (const hostname of boundHostnames) {
            // 查找用户的其他可用权限
            const findAvailableStmt = db.prepare(`
              SELECT * FROM user_domains
              WHERE user_id = ? AND id != ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP AND is_used = 0
              ORDER BY expires_at ASC
              LIMIT 1
            `);
            const availablePermission = findAvailableStmt.get(hostname.user_id, permissionId);

            if (availablePermission) {
              // 迁移到新权限
              const migrateStmt = db.prepare(`UPDATE custom_hostnames SET permission_id = ? WHERE id = ?`);
              migrateStmt.run(availablePermission.id, hostname.id);

              // 标记新权限为已使用
              const markUsedStmt = db.prepare(`UPDATE user_domains SET is_used = 1 WHERE id = ?`);
              markUsedStmt.run(availablePermission.id);

              result.migrated_hostnames.push(hostname.custom_hostname);
            } else {
              // 无法迁移，需要删除主机名和CF资源
              hostnamesNeedingCFDeletion.push(hostname);
              const deleteHostnameStmt = db.prepare(`DELETE FROM custom_hostnames WHERE id = ?`);
              deleteHostnameStmt.run(hostname.id);
              result.deleted_hostnames.push(hostname.custom_hostname);
            }
          }
        }

        // 删除权限记录
        const deletePermissionStmt = db.prepare(`DELETE FROM user_domains WHERE id = ?`);
        deletePermissionStmt.run(permissionId);

        return result;
      });

      const transactionResult = transaction();

      // 在事务外删除CF资源（避免阻塞数据库事务）
      for (const hostname of hostnamesNeedingCFDeletion) {
        try {
          const cfService = new CloudflareService(hostname.cf_api_key, hostname.cf_email);

          // 删除CF资源
          const cfDeletionPromises = [];

          if (hostname.cf_hostname_id) {
            cfDeletionPromises.push(
              cfService.deleteCustomHostname(hostname.domain, hostname.cf_hostname_id)
                .catch(error => {
                  console.warn(`删除CF自定义主机名失败 (${hostname.custom_hostname}):`, error.message);
                })
            );
          }

          if (hostname.cf_dns_record_id) {
            cfDeletionPromises.push(
              cfService.deleteDNSRecord(hostname.domain, hostname.cf_dns_record_id)
                .catch(error => {
                  console.warn(`删除CF DNS记录失败 (${hostname.custom_hostname}):`, error.message);
                })
            );
          }

          // 并行执行CF删除操作
          await Promise.all(cfDeletionPromises);
          console.log(`已删除主机名 ${hostname.custom_hostname} 的CF资源`);
        } catch (error) {
          console.error(`删除主机名 ${hostname.custom_hostname} 的CF资源失败:`, error.message);
        }
      }

      return transactionResult;
    } catch (error) {
      throw error;
    }
  }




}

module.exports = UserDomain;
