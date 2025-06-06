const CustomHostname = require('../models/CustomHostname');
const UserDomain = require('../models/UserDomain');
const User = require('../models/User');
const CloudflareService = require('./CloudflareService');

class CleanupService {
  constructor() {
    this.isRunning = false;
  }

  // 启动定时清理任务
  start() {
    if (this.isRunning) {
      console.log('清理服务已在运行');
      return;
    }

    this.isRunning = true;
    console.log('启动自动清理服务');

    // 每小时执行一次清理
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(error => {
        console.error('定时清理任务执行失败:', error);
      });
    }, 60 * 60 * 1000); // 1小时

    // 启动时立即执行一次清理
    this.performCleanup().catch(error => {
      console.error('启动时清理任务执行失败:', error);
    });
  }

  // 停止定时清理任务
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('清理服务已停止');
  }

  // 执行清理任务
  async performCleanup() {
    console.log('开始执行清理任务...');

    try {
      // 1. 清理过期的权限和关联的主机名
      await this.cleanupExpiredPermissions();

      // 2. 清理过期的自定义主机名
      await this.cleanupExpiredHostnames();

      // 3. 清理被禁用用户的主机名
      await this.cleanupInactiveUserHostnames();

      console.log('清理任务执行完成');
    } catch (error) {
      console.error('清理任务执行失败:', error);
      throw error;
    }
  }

  // 清理过期的权限和关联的主机名
  async cleanupExpiredPermissions() {
    try {
      console.log('开始清理过期的权限和关联的主机名...');

      // 查找过期权限绑定的主机名
      const expiredPermissionHostnames = await CustomHostname.findByExpiredPermissions();
      console.log(`发现 ${expiredPermissionHostnames.length} 个过期权限绑定的主机名`);

      for (const hostname of expiredPermissionHostnames) {
        try {
          await this.deleteHostnameWithCF(hostname, false); // 不释放权限，因为权限已过期
          console.log(`已清理过期权限绑定的主机名: ${hostname.custom_hostname}`);
        } catch (error) {
          console.error(`清理过期权限主机名 ${hostname.custom_hostname} 失败:`, error.message);
        }
      }

      // 清理过期权限记录
      await UserDomain.cleanupExpiredPermissions();
    } catch (error) {
      console.error('清理过期权限失败:', error);
      throw error;
    }
  }

  // 清理过期的自定义主机名
  async cleanupExpiredHostnames() {
    try {
      console.log('开始清理过期的自定义主机名...');

      const expiredHostnames = await CustomHostname.findExpired();
      console.log(`发现 ${expiredHostnames.length} 个过期的自定义主机名`);

      for (const hostname of expiredHostnames) {
        try {
          await this.deleteHostnameWithCF(hostname);
          console.log(`已清理过期主机名: ${hostname.custom_hostname}`);
        } catch (error) {
          console.error(`清理过期主机名 ${hostname.custom_hostname} 失败:`, error.message);
        }
      }
    } catch (error) {
      console.error('清理过期主机名失败:', error);
      throw error;
    }
  }

  // 清理被禁用用户的主机名
  async cleanupInactiveUserHostnames() {
    try {
      console.log('开始清理被禁用用户的主机名...');

      // 获取所有被禁用用户的主机名
      const inactiveUserHostnames = await CustomHostname.findByInactiveUsers();
      console.log(`发现 ${inactiveUserHostnames.length} 个被禁用用户的主机名`);

      for (const hostname of inactiveUserHostnames) {
        try {
          await this.deleteHostnameWithCF(hostname);
          console.log(`已清理被禁用用户主机名: ${hostname.custom_hostname} (用户ID: ${hostname.user_id})`);
        } catch (error) {
          console.error(`清理被禁用用户主机名 ${hostname.custom_hostname} 失败:`, error.message);
        }
      }
    } catch (error) {
      console.error('清理被禁用用户主机名失败:', error);
      throw error;
    }
  }

  // 删除主机名并清理CF资源
  async deleteHostnameWithCF(hostname, releasePermission = true) {
    try {
      // 创建CF服务实例
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

      // 删除数据库记录
      await CustomHostname.delete(hostname.id);

      // 释放对应的权限（如果需要且权限ID存在）
      if (releasePermission && hostname.permission_id) {
        try {
          await UserDomain.releaseSubdomain(hostname.permission_id);
          console.log(`清理服务已释放权限ID: ${hostname.permission_id}`);
        } catch (error) {
          console.warn(`释放权限失败 (权限ID: ${hostname.permission_id}):`, error.message);
        }
      }

    } catch (error) {
      console.error(`删除主机名 ${hostname.custom_hostname} 失败:`, error);
      throw error;
    }
  }

  // 释放用户权限（兼容旧代码）
  async releaseUserPermission(userId, expiresAt) {
    try {
      // 使用智能释放方法
      const released = await UserDomain.smartReleaseSubdomain(userId);
      if (released) {
        console.log(`清理服务已释放用户 ${userId} 的权限`);
      }
    } catch (error) {
      console.error(`释放用户权限失败:`, error);
      throw error;
    }
  }

  // 手动触发清理（用于管理员操作）
  async manualCleanup() {
    console.log('手动触发清理任务');
    return await this.performCleanup();
  }
}

module.exports = CleanupService;
