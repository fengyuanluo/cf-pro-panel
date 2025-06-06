const Card = require('../models/Card');
const Domain = require('../models/Domain');
const UserDomain = require('../models/UserDomain');
const CustomHostname = require('../models/CustomHostname');
const CloudflareService = require('../services/CloudflareService');
const { body, validationResult } = require('express-validator');

// 工具函数：提取SSL验证信息
function extractSSLValidation(cfHostnameResult) {
  const sslValidationRecords = cfHostnameResult.ssl?.validation_records || [];
  let sslValidation = null;

  // 首先查找validation_records中的TXT记录
  if (sslValidationRecords.length > 0) {
    sslValidation = sslValidationRecords.find(r => r.txt_name && r.txt_value);
  }

  // 如果validation_records中没有，检查ssl对象的直接属性
  if (!sslValidation && cfHostnameResult.ssl?.txt_name) {
    sslValidation = {
      txt_name: cfHostnameResult.ssl.txt_name,
      txt_value: cfHostnameResult.ssl.txt_value
    };
  }

  // 如果还是没有，检查ssl.settings中是否有验证信息
  if (!sslValidation && cfHostnameResult.ssl?.settings?.txt_name) {
    sslValidation = {
      txt_name: cfHostnameResult.ssl.settings.txt_name,
      txt_value: cfHostnameResult.ssl.settings.txt_value
    };
  }

  return sslValidation;
}

class UserController {
  // 兑换卡密
  static async redeemCard(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { card_code } = req.body;
      const userId = req.user.id;

      console.log('用户兑换卡密:', { card_code, userId });

      // 查找卡密 - 添加调试信息
      const card = await Card.findByCode(card_code);
      console.log('查找到的卡密:', card);

      if (!card) {
        console.log('卡密不存在:', card_code);
        return res.status(404).json({
          error: '卡密不存在，请检查卡密是否输入正确',
          code: 'CARD_NOT_FOUND'
        });
      }

      // 检查卡密状态
      if (card.status !== 'unused') {
        console.log('卡密状态异常:', card.status);
        const usedDate = card.used_at ? new Date(card.used_at).toLocaleString('zh-CN') : '未知时间';
        return res.status(400).json({
          error: `卡密已于 ${usedDate} 被使用，每张卡密只能使用一次`,
          code: 'CARD_ALREADY_USED'
        });
      }

      // 检查卡密是否过期
      if (new Date(card.expires_at) < new Date()) {
        console.log('卡密已过期:', card.expires_at);
        const expiredDate = new Date(card.expires_at).toLocaleString('zh-CN');
        return res.status(400).json({
          error: `卡密已于 ${expiredDate} 过期，请联系管理员获取新的卡密`,
          code: 'CARD_EXPIRED'
        });
      }

      // 使用卡密
      const permission = await Card.use(card_code, userId);
      console.log('卡密使用成功:', permission);
      res.json({ message: '卡密兑换成功', permission });
    } catch (error) {
      console.error('兑换卡密错误:', error);
      res.status(500).json({ error: `兑换卡密失败: ${error.message}` });
    }
  }

  // 续期卡密 - 专用于主机名续期
  static async renewHostname(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { card_code, hostname_id } = req.body;
      const userId = req.user.id;

      console.log('用户续期主机名:', { card_code, hostname_id, userId });

      // 验证主机名是否属于当前用户
      const hostname = await CustomHostname.findById(hostname_id);
      if (!hostname || hostname.user_id !== userId) {
        return res.status(404).json({
          error: '主机名不存在或无权限访问',
          code: 'HOSTNAME_NOT_FOUND'
        });
      }

      // 查找卡密
      const card = await Card.findByCode(card_code);
      if (!card) {
        return res.status(404).json({
          error: '卡密不存在，请检查卡密是否输入正确',
          code: 'CARD_NOT_FOUND'
        });
      }

      // 检查卡密状态
      if (card.status !== 'unused') {
        return res.status(400).json({
          error: '卡密已被使用或已过期',
          code: 'CARD_ALREADY_USED'
        });
      }

      // 检查卡密是否过期
      if (new Date(card.expires_at) < new Date()) {
        return res.status(400).json({
          error: '卡密已过期',
          code: 'CARD_EXPIRED'
        });
      }

      // 检查卡密类型
      if (card.card_type !== 'renew') {
        return res.status(400).json({
          error: '此卡密不是续期卡密，请使用续期类型的卡密',
          code: 'INVALID_CARD_TYPE'
        });
      }

      // 使用卡密进行续期
      const permission = await Card.use(card_code, userId);
      console.log('续期卡密使用成功:', permission);

      res.json({
        message: '主机名续期成功',
        permission,
        hostname_id: hostname_id
      });
    } catch (error) {
      console.error('续期主机名错误:', error);
      res.status(500).json({ error: `续期失败: ${error.message}` });
    }
  }

  // 获取用户权限信息
  static async getUserPermissions(req, res) {
    try {
      const userId = req.user.id;
      console.log('获取用户权限请求:', { userId });

      const permissions = await UserDomain.getUserPermissions(userId);
      const stats = await UserDomain.getUserStats(userId);

      console.log('权限查询结果:', { permissions: permissions.length, stats });
      res.json({ permissions, stats });
    } catch (error) {
      console.error('获取用户权限错误:', error);
      res.status(500).json({
        error: '获取用户权限失败',
        details: error.message
      });
    }
  }

  // 获取可用域名列表
  static async getAvailableDomains(_req, res) {
    try {
      const domains = await Domain.findActive();
      res.json({ domains });
    } catch (error) {
      console.error('获取可用域名错误:', error);
      res.status(500).json({ error: '获取可用域名失败' });
    }
  }

  // 接入域名
  static async addCustomHostname(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { custom_hostname, target_ip, domain_id, record_type = 'A' } = req.body;
      const userId = req.user.id;

      // 检查用户是否有可用权限
      const available = await UserDomain.getAvailableSubdomains(userId);
      if (available.available_count <= 0) {
        const permissions = await UserDomain.getUserPermissions(userId);
        if (permissions.length === 0) {
          return res.status(400).json({
            error: '您还没有任何主机名权限，请先兑换卡密获取权限',
            code: 'NO_PERMISSIONS'
          });
        } else {
          const hasExpired = permissions.every(p => new Date(p.expires_at) < new Date());
          if (hasExpired) {
            return res.status(400).json({
              error: '您的所有权限都已过期，请兑换新的卡密',
              code: 'PERMISSIONS_EXPIRED'
            });
          } else {
            return res.status(400).json({
              error: '您的主机名额度已用完，请等待权限释放或兑换新的卡密',
              code: 'QUOTA_EXHAUSTED'
            });
          }
        }
      }

      // 获取域名信息
      const domain = await Domain.findById(domain_id);
      if (!domain) {
        return res.status(400).json({
          error: '选择的域名不存在，请重新选择',
          code: 'DOMAIN_NOT_FOUND'
        });
      }
      if (domain.status !== 'active') {
        return res.status(400).json({
          error: '选择的域名已被禁用，请选择其他域名',
          code: 'DOMAIN_INACTIVE'
        });
      }

      // 检查域名主机名数量限制
      const limitCheck = await Domain.checkHostnameLimit(domain_id);
      if (!limitCheck.can_add) {
        return res.status(400).json({
          error: `域名 ${domain.domain} 已达到最大主机名数量限制 (${limitCheck.current_hostnames}/${limitCheck.max_hostnames})，请选择其他域名`,
          code: 'DOMAIN_LIMIT_EXCEEDED',
          details: {
            domain: domain.domain,
            current: limitCheck.current_hostnames,
            max: limitCheck.max_hostnames
          }
        });
      }

      // 生成唯一的子域名前缀
      const subdomainPrefix = await Domain.generateUniqueSubdomainPrefix(domain_id);
      const subdomain = `${subdomainPrefix}.${domain.domain}`;

      // 使用权限
      const permission = await UserDomain.useSubdomain(userId);

      // 创建CF服务实例
      const cfService = new CloudflareService(domain.cf_api_key, domain.cf_email);

      try {
        console.log('开始创建CF资源:', {
          subdomain,
          subdomainPrefix,
          target_ip,
          record_type,
          custom_hostname,
          domain: domain.domain
        });

        // 创建DNS记录
        const dnsRecord = await cfService.createDNSRecord(domain.domain, subdomain, target_ip, record_type);
        console.log('DNS记录创建成功:', dnsRecord.id);

        // 创建自定义主机名
        const customHostnameResult = await cfService.createCustomHostname(domain.domain, custom_hostname, subdomain);
        console.log('自定义主机名创建成功:', customHostnameResult.id);

        // 保存到数据库，绑定到特定权限
        const hostnameData = {
          user_id: userId,
          domain_id: domain_id,
          custom_hostname,
          subdomain,
          subdomain_prefix: subdomainPrefix,
          target_ip,
          record_type,
          expires_at: permission.expires_at,
          permission_id: permission.id
        };

        const hostname = await CustomHostname.create(hostnameData);

        console.log('CF自定义主机名创建结果:', JSON.stringify(customHostnameResult, null, 2));

        // 提取验证信息
        const sslValidation = extractSSLValidation(customHostnameResult);
        const ownershipValidation = customHostnameResult.ownership_verification;

        console.log('SSL验证记录:', JSON.stringify(customHostnameResult.ssl?.validation_records, null, 2));
        console.log('所有权验证:', JSON.stringify(ownershipValidation, null, 2));
        console.log('提取的SSL验证信息:', sslValidation);

        const verificationInfo = {
          cf_hostname_id: customHostnameResult.id,
          cf_dns_record_id: dnsRecord.id,
          verification_txt_name: sslValidation?.txt_name || '',
          verification_txt_value: sslValidation?.txt_value || '',
          hostname_txt_name: ownershipValidation?.name || '',
          hostname_txt_value: ownershipValidation?.value || ''
        };

        console.log('提取的验证信息:', verificationInfo);

        // 更新CF信息
        console.log('准备更新CF信息，主机名ID:', hostname.id);
        const updateResult = await CustomHostname.updateCFInfo(hostname.id, verificationInfo);
        console.log('CF信息更新结果:', updateResult);

        res.status(201).json({
          message: '域名接入成功，请按照以下信息完成DNS验证',
          hostname: {
            ...hostname,
            ...verificationInfo
          },
          verification: {
            ssl_verification: {
              name: verificationInfo.verification_txt_name,
              value: verificationInfo.verification_txt_value,
              description: '证书验证 TXT 记录'
            },
            hostname_verification: {
              name: verificationInfo.hostname_txt_name,
              value: verificationInfo.hostname_txt_value,
              description: '主机名预验证 TXT 记录'
            },
            instructions: [
              '1. 在您的DNS服务商处添加以上TXT记录',
              '2. 等待DNS记录生效（通常需要几分钟到几小时）',
              '3. 点击"刷新状态"按钮检查验证状态',
              '4. 验证成功后，您的域名将开始使用Cloudflare服务'
            ]
          }
        });
      } catch (cfError) {
        // CF操作失败，回滚权限使用
        await UserDomain.releaseSubdomain(permission.id);
        throw cfError;
      }
    } catch (error) {
      console.error('接入域名错误:', error);
      res.status(500).json({ error: `接入域名失败: ${error.message}` });
    }
  }

  // 获取用户的域名列表
  static async getUserHostnames(req, res) {
    try {
      const userId = req.user.id;
      console.log('获取用户主机名请求:', { userId });

      const hostnames = await CustomHostname.findByUser(userId);
      console.log('主机名查询结果:', { count: hostnames.length });

      res.json({ hostnames });
    } catch (error) {
      console.error('获取用户域名错误:', error);
      res.status(500).json({
        error: '获取用户域名失败',
        details: error.message
      });
    }
  }

  // 刷新域名状态
  static async refreshHostnameStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const hostname = await CustomHostname.findById(id);
      if (!hostname || hostname.user_id !== userId) {
        return res.status(404).json({ error: '域名不存在' });
      }

      if (!hostname.cf_hostname_id) {
        console.error('域名初始化不完整:', {
          hostname_id: hostname.id,
          custom_hostname: hostname.custom_hostname,
          cf_hostname_id: hostname.cf_hostname_id,
          cf_dns_record_id: hostname.cf_dns_record_id
        });
        return res.status(400).json({
          error: '域名尚未完成初始化，请联系管理员检查',
          details: {
            hostname_id: hostname.id,
            has_cf_hostname_id: !!hostname.cf_hostname_id,
            has_cf_dns_record_id: !!hostname.cf_dns_record_id
          }
        });
      }

      // 创建CF服务实例
      const cfService = new CloudflareService(hostname.cf_api_key, hostname.cf_email);

      console.log('刷新状态 - CF配置:', {
        domain: hostname.domain,
        hostname_id: hostname.cf_hostname_id,
        email: hostname.cf_email
      });

      // 获取最新状态
      const cfHostname = await cfService.getCustomHostname(hostname.domain, hostname.cf_hostname_id);

      // 更新状态
      let status = 'pending';
      let statusMessage = '待验证';

      if (cfHostname.ssl?.status === 'active') {
        status = 'active';
        statusMessage = '已激活';
      } else if (cfHostname.ssl?.status === 'pending_validation') {
        status = 'pending';
        statusMessage = '等待DNS验证';
      } else if (cfHostname.ssl?.status === 'pending_issuance') {
        status = 'pending';
        statusMessage = '证书签发中';
      } else if (cfHostname.ssl?.status === 'pending_deployment') {
        status = 'pending';
        statusMessage = '证书部署中';
      }

      await CustomHostname.updateStatus(id, status);

      // 提取验证信息
      const sslValidation = extractSSLValidation(cfHostname);

      const ownershipValidation = cfHostname.ownership_verification;

      // 如果从CF API获取到了新的验证信息，更新数据库
      if (sslValidation?.txt_name || ownershipValidation?.name) {
        const updateInfo = {};
        if (sslValidation?.txt_name) {
          updateInfo.verification_txt_name = sslValidation.txt_name;
          updateInfo.verification_txt_value = sslValidation.txt_value;
        }
        if (ownershipValidation?.name) {
          updateInfo.hostname_txt_name = ownershipValidation.name;
          updateInfo.hostname_txt_value = ownershipValidation.value;
        }

        if (Object.keys(updateInfo).length > 0) {
          await CustomHostname.updateCFInfo(id, updateInfo);
        }
      }

      res.json({
        message: '状态刷新成功',
        status,
        status_message: statusMessage,
        ssl_status: cfHostname.ssl?.status,
        validation_errors: cfHostname.ssl?.validation_errors || [],
        verification: {
          ssl_verification: {
            name: sslValidation?.txt_name || hostname.verification_txt_name || '',
            value: sslValidation?.txt_value || hostname.verification_txt_value || '',
            description: '证书验证 TXT 记录'
          },
          hostname_verification: {
            name: ownershipValidation?.name || hostname.hostname_txt_name || '',
            value: ownershipValidation?.value || hostname.hostname_txt_value || '',
            description: '主机名预验证 TXT 记录'
          },
          instructions: [
            '1. 在您的DNS服务商处添加以上TXT记录',
            '2. 等待DNS记录生效（通常需要几分钟到几小时）',
            '3. 点击"刷新状态"按钮检查验证状态',
            '4. 验证成功后，您的域名将开始使用Cloudflare服务'
          ]
        }
      });
    } catch (error) {
      console.error('刷新域名状态错误:', error);
      res.status(500).json({ error: `刷新状态失败: ${error.message}` });
    }
  }

  // 删除域名
  static async deleteHostname(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const hostname = await CustomHostname.findById(id);
      if (!hostname || hostname.user_id !== userId) {
        return res.status(404).json({ error: '域名不存在' });
      }

      // 创建CF服务实例
      const cfService = new CloudflareService(hostname.cf_api_key, hostname.cf_email);

      console.log('开始删除CF资源:', {
        hostname_id: hostname.id,
        custom_hostname: hostname.custom_hostname,
        domain: hostname.domain,
        cf_hostname_id: hostname.cf_hostname_id,
        cf_dns_record_id: hostname.cf_dns_record_id,
        user_id: userId
      });

      let cfDeletionErrors = [];

      try {
        // 删除CF自定义主机名
        if (hostname.cf_hostname_id) {
          console.log(`删除CF自定义主机名: ${hostname.cf_hostname_id}`);
          await cfService.deleteCustomHostname(hostname.domain, hostname.cf_hostname_id);
          console.log(`✅ CF自定义主机名删除成功: ${hostname.cf_hostname_id}`);
        } else {
          console.log('⚠️ 没有CF自定义主机名ID，跳过删除');
        }
      } catch (cfError) {
        const errorMsg = `删除CF自定义主机名失败 (${hostname.cf_hostname_id}): ${cfError.message}`;
        console.error('❌', errorMsg);
        cfDeletionErrors.push(errorMsg);
      }

      try {
        // 删除CF DNS记录
        if (hostname.cf_dns_record_id) {
          console.log(`删除CF DNS记录: ${hostname.cf_dns_record_id}`);
          await cfService.deleteDNSRecord(hostname.domain, hostname.cf_dns_record_id);
          console.log(`✅ CF DNS记录删除成功: ${hostname.cf_dns_record_id}`);
        } else {
          console.log('⚠️ 没有CF DNS记录ID，跳过删除');
        }
      } catch (cfError) {
        const errorMsg = `删除CF DNS记录失败 (${hostname.cf_dns_record_id}): ${cfError.message}`;
        console.error('❌', errorMsg);
        cfDeletionErrors.push(errorMsg);
      }

      // 如果有CF删除错误，记录详细信息
      if (cfDeletionErrors.length > 0) {
        console.error('CF资源删除存在错误:', cfDeletionErrors);
      }

      // 删除数据库记录
      await CustomHostname.delete(id);

      // 释放对应的权限
      if (hostname.permission_id) {
        try {
          await UserDomain.releaseSubdomain(hostname.permission_id);
          console.log(`用户删除主机名时已释放权限ID: ${hostname.permission_id}`);
        } catch (permissionError) {
          console.warn('释放用户权限失败:', permissionError.message);
        }
      }

      res.json({ message: '域名删除成功' });
    } catch (error) {
      console.error('删除域名错误:', error);
      res.status(500).json({ error: `删除域名失败: ${error.message}` });
    }
  }

  // 编辑域名IP
  static async editHostnameIP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { id } = req.params;
      const { target_ip } = req.body;
      const userId = req.user.id;

      const hostname = await CustomHostname.findById(id);
      if (!hostname || hostname.user_id !== userId) {
        return res.status(404).json({ error: '域名不存在' });
      }

      // 创建CF服务实例
      const cfService = new CloudflareService(hostname.cf_api_key, hostname.cf_email);

      // 更新DNS记录
      await cfService.updateDNSRecord(hostname.domain, hostname.cf_dns_record_id, target_ip);

      // 更新数据库
      await CustomHostname.updateTargetIP(id, target_ip, userId);

      res.json({ message: 'IP地址更新成功' });
    } catch (error) {
      console.error('编辑域名IP错误:', error);
      res.status(500).json({ error: `更新IP失败: ${error.message}` });
    }
  }
}

// 验证规则
const redeemCardValidation = [
  body('card_code').notEmpty().withMessage('卡密不能为空')
];

const renewHostnameValidation = [
  body('card_code').notEmpty().withMessage('卡密不能为空'),
  body('hostname_id').isInt().withMessage('主机名ID必须是整数')
];

const addHostnameValidation = [
  body('custom_hostname').isFQDN().withMessage('请输入有效的域名'),
  body('target_ip').isIP().withMessage('请输入有效的IP地址'),
  body('domain_id').isInt({ min: 1 }).withMessage('请选择有效的域名'),
  body('record_type').optional().isIn(['A', 'AAAA']).withMessage('记录类型只能是A或AAAA')
];

const editIPValidation = [
  body('target_ip').isIP().withMessage('请输入有效的IP地址')
];

module.exports = {
  UserController,
  redeemCardValidation,
  renewHostnameValidation,
  addHostnameValidation,
  editIPValidation
};
