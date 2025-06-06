const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// 支持Docker环境的数据库路径
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join('/app/data', 'cf_panel.db')
  : path.join(__dirname, 'cf_panel.db');
const db = new Database(dbPath);

// 初始化数据库表
function initDatabase() {
  try {
    // 用户表
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 合租域名表
    db.exec(`CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT UNIQUE NOT NULL,
      cf_api_key TEXT NOT NULL,
      cf_email TEXT NOT NULL,
      max_hostnames INTEGER DEFAULT 100,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 卡密表
    db.exec(`CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_code TEXT UNIQUE NOT NULL,
      subdomain_count INTEGER NOT NULL,
      validity_days INTEGER NOT NULL,
      card_type TEXT DEFAULT 'create',
      status TEXT DEFAULT 'unused',
      used_by INTEGER,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (used_by) REFERENCES users (id)
    )`);

    // 用户域名权限表 (重构为一对一关系)
    db.exec(`CREATE TABLE IF NOT EXISTS user_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subdomain_count INTEGER DEFAULT 1,
      is_used INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // 用户接入的域名表
    db.exec(`CREATE TABLE IF NOT EXISTS custom_hostnames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      domain_id INTEGER NOT NULL,
      custom_hostname TEXT NOT NULL,
      subdomain TEXT NOT NULL,
      subdomain_number INTEGER,
      subdomain_prefix TEXT,
      target_ip TEXT NOT NULL,
      record_type TEXT DEFAULT 'A',
      cf_hostname_id TEXT,
      cf_dns_record_id TEXT,
      verification_txt_name TEXT,
      verification_txt_value TEXT,
      hostname_txt_name TEXT,
      hostname_txt_value TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      permission_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (domain_id) REFERENCES domains (id),
      FOREIGN KEY (permission_id) REFERENCES user_domains (id)
    )`);

    // 数据库迁移：删除cf_zone_id字段
    try {
      // 检查是否存在cf_zone_id字段
      const tableInfo = db.prepare("PRAGMA table_info(domains)").all();
      const hasZoneIdField = tableInfo.some(column => column.name === 'cf_zone_id');

      if (hasZoneIdField) {
        console.log('检测到cf_zone_id字段，开始迁移...');

        // 创建新表结构
        db.exec(`CREATE TABLE domains_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT UNIQUE NOT NULL,
          cf_api_key TEXT NOT NULL,
          cf_email TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 迁移数据（只迁移有cf_email的记录）
        db.exec(`INSERT INTO domains_new (id, domain, cf_api_key, cf_email, status, created_at, updated_at)
                 SELECT id, domain, cf_api_key, cf_email, status, created_at, updated_at
                 FROM domains
                 WHERE cf_email IS NOT NULL AND cf_email != ''`);

        // 删除旧表
        db.exec(`DROP TABLE domains`);

        // 重命名新表
        db.exec(`ALTER TABLE domains_new RENAME TO domains`);

        console.log('数据库迁移完成：已删除cf_zone_id字段');
      }
    } catch (migrationError) {
      console.warn('数据库迁移警告:', migrationError.message);
    }

    // 数据库迁移：添加max_hostnames字段
    try {
      const tableInfo = db.prepare("PRAGMA table_info(domains)").all();
      const hasMaxHostnamesField = tableInfo.some(column => column.name === 'max_hostnames');

      if (!hasMaxHostnamesField) {
        console.log('添加max_hostnames字段...');
        db.exec(`ALTER TABLE domains ADD COLUMN max_hostnames INTEGER DEFAULT 100`);
        console.log('max_hostnames字段添加完成');
      }
    } catch (migrationError) {
      console.warn('添加max_hostnames字段警告:', migrationError.message);
    }

    // 数据库迁移：添加permission_id字段到custom_hostnames表
    try {
      const hostnameTableInfo = db.prepare("PRAGMA table_info(custom_hostnames)").all();
      const hasPermissionIdField = hostnameTableInfo.some(column => column.name === 'permission_id');

      if (!hasPermissionIdField) {
        console.log('添加permission_id字段到custom_hostnames表...');
        db.exec(`ALTER TABLE custom_hostnames ADD COLUMN permission_id INTEGER REFERENCES user_domains(id)`);
        console.log('permission_id字段添加完成');
      }
    } catch (migrationError) {
      console.warn('添加permission_id字段警告:', migrationError.message);
    }

    // 数据库迁移：添加card_type字段到cards表
    try {
      const cardTableInfo = db.prepare("PRAGMA table_info(cards)").all();
      const hasCardTypeField = cardTableInfo.some(column => column.name === 'card_type');

      if (!hasCardTypeField) {
        console.log('添加card_type字段到cards表...');
        db.exec(`ALTER TABLE cards ADD COLUMN card_type TEXT DEFAULT 'create'`);
        console.log('card_type字段添加完成');
      }
    } catch (migrationError) {
      console.warn('添加card_type字段警告:', migrationError.message);
    }

    // 数据库迁移：重构user_domains表结构
    try {
      const userDomainTableInfo = db.prepare("PRAGMA table_info(user_domains)").all();
      const hasUsedCountField = userDomainTableInfo.some(column => column.name === 'used_count');
      const hasIsUsedField = userDomainTableInfo.some(column => column.name === 'is_used');

      if (hasUsedCountField && !hasIsUsedField) {
        console.log('重构user_domains表结构...');

        // 创建新表结构
        db.exec(`CREATE TABLE user_domains_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          subdomain_count INTEGER DEFAULT 1,
          is_used INTEGER DEFAULT 0,
          expires_at DATETIME NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // 迁移数据 - 将每个额度拆分为单独的记录
        const oldPermissions = db.prepare(`SELECT * FROM user_domains`).all();
        const insertStmt = db.prepare(`INSERT INTO user_domains_new (user_id, subdomain_count, is_used, expires_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`);

        for (const permission of oldPermissions) {
          for (let i = 0; i < permission.subdomain_count; i++) {
            const isUsed = i < (permission.used_count || 0) ? 1 : 0;
            insertStmt.run(permission.user_id, 1, isUsed, permission.expires_at, permission.status, permission.created_at);
          }
        }

        // 删除旧表
        db.exec(`DROP TABLE user_domains`);

        // 重命名新表
        db.exec(`ALTER TABLE user_domains_new RENAME TO user_domains`);

        console.log('user_domains表结构重构完成');
      }
    } catch (migrationError) {
      console.warn('重构user_domains表结构警告:', migrationError.message);
    }

    // 数据库迁移：添加subdomain_prefix字段到custom_hostnames表
    try {
      const hostnameTableInfo = db.prepare("PRAGMA table_info(custom_hostnames)").all();
      const hasSubdomainPrefixField = hostnameTableInfo.some(column => column.name === 'subdomain_prefix');

      if (!hasSubdomainPrefixField) {
        console.log('添加subdomain_prefix字段到custom_hostnames表...');
        db.exec(`ALTER TABLE custom_hostnames ADD COLUMN subdomain_prefix TEXT`);

        // 为现有记录生成前缀（从subdomain_number转换）
        const existingHostnames = db.prepare(`SELECT id, subdomain_number FROM custom_hostnames WHERE subdomain_prefix IS NULL`).all();
        const updateStmt = db.prepare(`UPDATE custom_hostnames SET subdomain_prefix = ? WHERE id = ?`);

        for (const hostname of existingHostnames) {
          // 将数字转换为6位字母前缀（向后兼容）
          const prefix = hostname.subdomain_number.toString().padStart(6, '0').replace(/\d/g, (d) => String.fromCharCode(97 + parseInt(d)));
          updateStmt.run(prefix, hostname.id);
        }

        console.log('subdomain_prefix字段添加完成');
      }
    } catch (migrationError) {
      console.warn('添加subdomain_prefix字段警告:', migrationError.message);
    }

    // 创建默认管理员账户
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const insertAdmin = db.prepare(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`);
    insertAdmin.run('admin', adminPassword, 'admin');

    console.log('数据库初始化完成');
    console.log('默认管理员账户: admin / admin123');
    return Promise.resolve();
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return Promise.reject(error);
  }
}

// 如果直接运行此文件，则初始化数据库
if (require.main === module) {
  initDatabase().then(() => {
    db.close();
    process.exit(0);
  }).catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
}

module.exports = { initDatabase, db };
