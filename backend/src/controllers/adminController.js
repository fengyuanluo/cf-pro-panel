const User = require('../models/User');
const Domain = require('../models/Domain');
const Card = require('../models/Card');
const UserDomain = require('../models/UserDomain');
const CustomHostname = require('../models/CustomHostname');
const CloudflareService = require('../services/CloudflareService');
const CleanupService = require('../services/CleanupService');
const { body, validationResult } = require('express-validator');

class AdminController {
  // 获取所有用户
  static async getUsers(req, res) {
    try {
      const users = await User.findAll();
      res.json({ users });
    } catch (error) {
      console.error('获取用户列表错误:', error);
      res.status(500).json({ error: '获取用户列表失败' });
    }
  }

  // 创建用户
  static async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { username, password, email, role = 'user' } = req.body;

      const user = await User.create({ username, password, email, role });
      res.status(201).json({ message: '用户创建成功', user });
    } catch (error) {
      console.error('创建用户错误:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: '用户名已存在' });
      } else {
        res.status(500).json({ error: '创建用户失败' });
      }
    }
  }

  // 更新用户状态
  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const success = await User.updateStatus(id, status);
      if (success) {
        res.json({ message: '用户状态更新成功' });
      } else {
        res.status(404).json({ error: '用户不存在' });
      }
    } catch (error) {
      console.error('更新用户状态错误:', error);
      res.status(500).json({ error: '更新用户状态失败' });
    }
  }

  // 删除用户
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const success = await User.delete(id);
      if (success) {
        res.json({ message: '用户删除成功' });
      } else {
        res.status(404).json({ error: '用户不存在' });
      }
    } catch (error) {
      console.error('删除用户错误:', error);
      res.status(500).json({ error: '删除用户失败' });
    }
  }

  // 获取所有域名
  static async getDomains(req, res) {
    try {
      const domains = await Domain.findAll();
      res.json({ domains });
    } catch (error) {
      console.error('获取域名列表错误:', error);
      res.status(500).json({ error: '获取域名列表失败' });
    }
  }

  // 添加域名
  static async addDomain(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { domain, cf_api_key, cf_email, max_hostnames = 100 } = req.body;

      const newDomain = await Domain.create({ domain, cf_api_key, cf_email, max_hostnames });
      res.status(201).json({ message: '域名添加成功', domain: newDomain });
    } catch (error) {
      console.error('添加域名错误:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: '域名已存在' });
      } else {
        res.status(500).json({ error: '添加域名失败' });
      }
    }
  }

  // 删除域名
  static async deleteDomain(req, res) {
    try {
      const { id } = req.params;

      // 获取域名信息
      const domain = await Domain.findById(id);
      if (!domain) {
        return res.status(404).json({ error: '域名不存在' });
      }

      // 获取该域名下的所有自定义主机名
      const hostnames = await CustomHostname.findByDomain(id);

      // 创建CF服务实例
      const cfService = new CloudflareService(domain.cf_api_key, domain.cf_email);

      // 删除所有相关的CF资源
      for (const hostname of hostnames) {
        try {
          if (hostname.cf_hostname_id) {
            await cfService.deleteCustomHostname(domain.domain, hostname.cf_hostname_id);
          }
          if (hostname.cf_dns_record_id) {
            await cfService.deleteDNSRecord(domain.domain, hostname.cf_dns_record_id);
          }
        } catch (cfError) {
          console.warn(`删除主机名 ${hostname.custom_hostname} 的CF资源失败:`, cfError.message);
        }
      }

      // 删除数据库中的自定义主机名记录并释放用户权限
      for (const hostname of hostnames) {
        // 释放对应的权限
        if (hostname.permission_id) {
          try {
            await UserDomain.releaseSubdomain(hostname.permission_id);
            console.log(`删除域名时已释放权限ID: ${hostname.permission_id} (用户: ${hostname.user_id})`);
          } catch (permissionError) {
            console.warn(`释放权限失败 (权限ID: ${hostname.permission_id}):`, permissionError.message);
          }
        }

        await CustomHostname.delete(hostname.id);
      }

      // 删除域名
      const success = await Domain.delete(id);
      if (success) {
        res.json({
          message: `域名删除成功，同时删除了 ${hostnames.length} 个相关的自定义主机名`
        });
      } else {
        res.status(404).json({ error: '域名不存在' });
      }
    } catch (error) {
      console.error('删除域名错误:', error);
      res.status(500).json({ error: `删除域名失败: ${error.message}` });
    }
  }

  // 生成卡密
  static async generateCards(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { subdomain_count, validity_days, quantity, card_type = 'create' } = req.body;

      const cards = await Card.create({ subdomain_count, validity_days, quantity, card_type });
      res.status(201).json({ message: '卡密生成成功', cards });
    } catch (error) {
      console.error('生成卡密错误:', error);
      res.status(500).json({ error: '生成卡密失败' });
    }
  }

  // 获取所有卡密
  static async getCards(req, res) {
    try {
      const cards = await Card.findAll();
      res.json({ cards });
    } catch (error) {
      console.error('获取卡密列表错误:', error);
      res.status(500).json({ error: '获取卡密列表失败' });
    }
  }

  // 删除卡密
  static async deleteCard(req, res) {
    try {
      const { id } = req.params;

      const success = await Card.delete(id);
      if (success) {
        res.json({ message: '卡密删除成功' });
      } else {
        res.status(404).json({ error: '卡密不存在' });
      }
    } catch (error) {
      console.error('删除卡密错误:', error);
      res.status(500).json({ error: '删除卡密失败' });
    }
  }

  // 获取所有用户的自定义主机名
  static async getAllHostnames(req, res) {
    try {
      const hostnames = await CustomHostname.findAllWithUserInfo();
      res.json({ hostnames });
    } catch (error) {
      console.error('获取所有主机名错误:', error);
      res.status(500).json({ error: '获取主机名列表失败' });
    }
  }

  // 管理员删除用户的自定义主机名
  static async deleteUserHostname(req, res) {
    try {
      const { id } = req.params;

      const hostname = await CustomHostname.findById(id);
      if (!hostname) {
        return res.status(404).json({ error: '域名不存在' });
      }

      // 创建CF服务实例
      const cfService = new CloudflareService(hostname.cf_api_key, hostname.cf_email);

      console.log('管理员删除CF资源:', {
        hostname_id: hostname.id,
        custom_hostname: hostname.custom_hostname,
        domain: hostname.domain,
        cf_hostname_id: hostname.cf_hostname_id,
        cf_dns_record_id: hostname.cf_dns_record_id
      });

      let cfDeletionErrors = [];

      try {
        // 删除CF自定义主机名
        if (hostname.cf_hostname_id) {
          console.log(`管理员删除CF自定义主机名: ${hostname.cf_hostname_id}`);
          await cfService.deleteCustomHostname(hostname.domain, hostname.cf_hostname_id);
          console.log(`✅ 管理员CF自定义主机名删除成功: ${hostname.cf_hostname_id}`);
        } else {
          console.log('⚠️ 没有CF自定义主机名ID，跳过删除');
        }
      } catch (cfError) {
        const errorMsg = `管理员删除CF自定义主机名失败 (${hostname.cf_hostname_id}): ${cfError.message}`;
        console.error('❌', errorMsg);
        cfDeletionErrors.push(errorMsg);
      }

      try {
        // 删除CF DNS记录
        if (hostname.cf_dns_record_id) {
          console.log(`管理员删除CF DNS记录: ${hostname.cf_dns_record_id}`);
          await cfService.deleteDNSRecord(hostname.domain, hostname.cf_dns_record_id);
          console.log(`✅ 管理员CF DNS记录删除成功: ${hostname.cf_dns_record_id}`);
        } else {
          console.log('⚠️ 没有CF DNS记录ID，跳过删除');
        }
      } catch (cfError) {
        const errorMsg = `管理员删除CF DNS记录失败 (${hostname.cf_dns_record_id}): ${cfError.message}`;
        console.error('❌', errorMsg);
        cfDeletionErrors.push(errorMsg);
      }

      // 如果有CF删除错误，记录详细信息
      if (cfDeletionErrors.length > 0) {
        console.error('管理员CF资源删除存在错误:', cfDeletionErrors);
      }

      // 删除数据库记录
      await CustomHostname.delete(id);

      // 释放对应的权限
      if (hostname.permission_id) {
        try {
          await UserDomain.releaseSubdomain(hostname.permission_id);
          console.log(`管理员删除主机名时已释放权限ID: ${hostname.permission_id}`);
        } catch (permissionError) {
          console.warn('释放用户权限失败:', permissionError.message);
        }
      }

      res.json({ message: '域名删除成功' });
    } catch (error) {
      console.error('管理员删除域名错误:', error);
      res.status(500).json({ error: `删除域名失败: ${error.message}` });
    }
  }

  // 管理员修复域名初始化问题
  static async repairHostname(req, res) {
    try {
      const { id } = req.params;

      const hostname = await CustomHostname.findById(id);
      if (!hostname) {
        return res.status(404).json({ error: '域名不存在' });
      }

      // 创建CF服务实例
      const cfService = new CloudflareService(hostname.cf_api_key, hostname.cf_email);

      console.log('开始修复域名:', {
        hostname_id: hostname.id,
        custom_hostname: hostname.custom_hostname,
        cf_hostname_id: hostname.cf_hostname_id,
        cf_dns_record_id: hostname.cf_dns_record_id
      });

      let repairActions = [];

      // 如果缺少DNS记录ID，尝试重新创建或查找
      if (!hostname.cf_dns_record_id) {
        try {
          const dnsRecord = await cfService.createDNSRecord(
            hostname.domain,
            hostname.subdomain,
            hostname.target_ip,
            hostname.record_type
          );
          await CustomHostname.updateCFInfo(hostname.id, {
            cf_dns_record_id: dnsRecord.id
          });
          repairActions.push('重新创建DNS记录');
        } catch (dnsError) {
          console.warn('重新创建DNS记录失败:', dnsError.message);
          repairActions.push('DNS记录创建失败');
        }
      }

      // 如果缺少自定义主机名ID，尝试重新创建或查找
      if (!hostname.cf_hostname_id) {
        try {
          const customHostnameResult = await cfService.createCustomHostname(
            hostname.domain,
            hostname.custom_hostname,
            hostname.subdomain
          );

          // 提取验证信息
          const sslValidationRecords = customHostnameResult.ssl?.validation_records || [];
          const ownershipValidation = customHostnameResult.ownership_verification;

          let sslValidation = null;
          if (sslValidationRecords.length > 0) {
            sslValidation = sslValidationRecords.find(r => r.txt_name && r.txt_value);
          }

          const verificationInfo = {
            cf_hostname_id: customHostnameResult.id,
            verification_txt_name: sslValidation?.txt_name || '',
            verification_txt_value: sslValidation?.txt_value || '',
            hostname_txt_name: ownershipValidation?.name || '',
            hostname_txt_value: ownershipValidation?.value || ''
          };

          await CustomHostname.updateCFInfo(hostname.id, verificationInfo);
          repairActions.push('重新创建自定义主机名');
        } catch (hostnameError) {
          console.warn('重新创建自定义主机名失败:', hostnameError.message);
          repairActions.push('自定义主机名创建失败');
        }
      }

      // 获取修复后的域名信息
      const repairedHostname = await CustomHostname.findById(id);

      res.json({
        message: '域名修复完成',
        repair_actions: repairActions,
        hostname: repairedHostname,
        success: repairActions.length > 0 && !repairActions.some(action => action.includes('失败'))
      });
    } catch (error) {
      console.error('修复域名错误:', error);
      res.status(500).json({ error: `修复域名失败: ${error.message}` });
    }
  }

  // 调整用户权限（添加新权限）
  static async adjustUserPermissions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { user_id, subdomain_count, validity_days } = req.body;

      const permission = await UserDomain.adjustUserPermissions(user_id, subdomain_count, validity_days);
      res.json({ message: '用户权限添加成功', permission });
    } catch (error) {
      console.error('添加用户权限错误:', error);
      res.status(500).json({ error: '添加用户权限失败' });
    }
  }

  // 获取用户所有权限
  static async getUserAllPermissions(req, res) {
    try {
      const { user_id } = req.params;

      const permissions = await UserDomain.getAllUserPermissions(user_id);
      const stats = await UserDomain.getUserStats(user_id);

      res.json({ permissions, stats });
    } catch (error) {
      console.error('获取用户权限错误:', error);
      res.status(500).json({ error: '获取用户权限失败' });
    }
  }

  // 删除用户权限
  static async deleteUserPermission(req, res) {
    try {
      const { permission_id } = req.params;

      // 检查权限是否存在
      const permission = await UserDomain.findById(permission_id);
      if (!permission) {
        return res.status(404).json({
          error: '权限记录不存在，可能已被删除',
          code: 'PERMISSION_NOT_FOUND'
        });
      }

      // 使用智能删除方法
      const result = await UserDomain.smartDeletePermission(permission_id);

      let message = '权限删除成功';
      if (result.migrated_hostnames.length > 0) {
        message += `，已将 ${result.migrated_hostnames.length} 个主机名迁移到其他权限`;
      }
      if (result.deleted_hostnames.length > 0) {
        message += `，已删除 ${result.deleted_hostnames.length} 个无法迁移的主机名`;
      }

      res.json({
        message,
        details: {
          migrated_hostnames: result.migrated_hostnames,
          deleted_hostnames: result.deleted_hostnames
        }
      });
    } catch (error) {
      console.error('删除用户权限错误:', error);
      res.status(500).json({ error: `删除用户权限失败: ${error.message}` });
    }
  }

  // 手动触发清理任务
  static async manualCleanup(req, res) {
    try {
      console.log('管理员手动触发清理任务');
      const cleanupService = new CleanupService();
      await cleanupService.manualCleanup();
      res.json({ message: '清理任务执行完成' });
    } catch (error) {
      console.error('手动清理任务失败:', error);
      res.status(500).json({ error: `清理任务失败: ${error.message}` });
    }
  }
}

// 验证规则
const createUserValidation = [
  body('username').isLength({ min: 3, max: 20 }).withMessage('用户名长度3-20位'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确'),
  body('role').optional().isIn(['user', 'admin']).withMessage('角色只能是user或admin')
];

const addDomainValidation = [
  body('domain').isFQDN().withMessage('请输入有效的域名'),
  body('cf_api_key').notEmpty().withMessage('CF API Key不能为空'),
  body('cf_email').isEmail().withMessage('CF邮箱地址是必需的且格式必须正确'),
  body('max_hostnames').optional().isInt({ min: 1, max: 10000 }).withMessage('最大主机名数量必须在1-10000之间')
];

const generateCardsValidation = [
  body('subdomain_count').isInt({ min: 1 }).withMessage('子域名数量必须大于0'),
  body('validity_days').isInt({ min: 1 }).withMessage('有效期必须大于0天'),
  body('quantity').isInt({ min: 1, max: 100 }).withMessage('生成数量1-100张'),
  body('card_type').optional().isIn(['create', 'renew']).withMessage('卡密类型只能是create或renew')
];

const adjustPermissionsValidation = [
  body('user_id').isInt({ min: 1 }).withMessage('用户ID无效'),
  body('subdomain_count').isInt({ min: 1 }).withMessage('子域名数量必须大于0'),
  body('validity_days').isInt({ min: 1 }).withMessage('有效期必须大于0天')
];

module.exports = {
  AdminController,
  createUserValidation,
  addDomainValidation,
  generateCardsValidation,
  adjustPermissionsValidation
};
