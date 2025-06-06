const { db } = require('../database/init');
const crypto = require('crypto');
const moment = require('moment');

class Card {
  static generateCardCode() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  static async create(cardData) {
    const { subdomain_count, validity_days, quantity = 1, card_type = 'create' } = cardData;
    const cards = [];

    try {
      const stmt = db.prepare(`INSERT INTO cards (card_code, subdomain_count, validity_days, card_type, expires_at) VALUES (?, ?, ?, ?, ?)`);

      for (let i = 0; i < quantity; i++) {
        const cardCode = this.generateCardCode();
        const expiresAt = moment().add(30, 'days').format('YYYY-MM-DD HH:mm:ss'); // 卡密30天有效期

        const result = stmt.run(cardCode, subdomain_count, validity_days, card_type, expiresAt);
        cards.push({
          id: result.lastInsertRowid,
          card_code: cardCode,
          subdomain_count,
          validity_days,
          card_type,
          expires_at: expiresAt
        });
      }

      return cards;
    } catch (error) {
      throw error;
    }
  }

  static async findAll() {
    try {
      const stmt = db.prepare(`
        SELECT c.*, u.username as used_by_username
        FROM cards c
        LEFT JOIN users u ON c.used_by = u.id
        ORDER BY c.created_at DESC
      `);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  static async findByCode(cardCode) {
    try {
      // 统一转换为大写进行查找，因为生成时是大写的
      const upperCardCode = cardCode.toUpperCase();
      console.log('查找卡密:', { original: cardCode, upper: upperCardCode });

      const stmt = db.prepare(`SELECT * FROM cards WHERE UPPER(card_code) = ?`);
      const result = stmt.get(upperCardCode);
      console.log('数据库查询结果:', result);

      return result;
    } catch (error) {
      console.error('查找卡密错误:', error);
      throw error;
    }
  }

  static async use(cardCode, userId) {
    try {
      const upperCardCode = cardCode.toUpperCase();
      console.log('使用卡密:', { cardCode, upperCardCode, userId });

      const transaction = db.transaction(() => {
        // 更新卡密状态 - 使用大写查找
        const updateCardStmt = db.prepare(`UPDATE cards SET status = 'used', used_by = ?, used_at = CURRENT_TIMESTAMP WHERE UPPER(card_code) = ?`);
        const updateResult = updateCardStmt.run(userId, upperCardCode);
        console.log('更新卡密状态结果:', updateResult);

        if (updateResult.changes === 0) {
          throw new Error('卡密更新失败，可能已被使用或不存在');
        }

        // 获取卡密信息
        const getCardStmt = db.prepare(`SELECT * FROM cards WHERE UPPER(card_code) = ?`);
        const card = getCardStmt.get(upperCardCode);
        console.log('获取卡密信息:', card);

        if (!card) {
          throw new Error('卡密信息获取失败');
        }

        if (card.card_type === 'create') {
          // 创建卡密：添加新的用户权限（一对一关系）
          const expiresAt = moment().add(card.validity_days, 'days').format('YYYY-MM-DD HH:mm:ss');
          const addPermissionStmt = db.prepare(`INSERT INTO user_domains (user_id, subdomain_count, is_used, expires_at) VALUES (?, ?, ?, ?)`);

          // 创建多个单独的额度记录
          const permissions = [];
          for (let i = 0; i < card.subdomain_count; i++) {
            const permissionResult = addPermissionStmt.run(userId, 1, 0, expiresAt);
            permissions.push({
              id: permissionResult.lastInsertRowid,
              subdomain_count: 1,
              expires_at: expiresAt
            });
          }

          console.log('添加用户权限结果:', permissions);
          return {
            type: 'create',
            subdomain_count: card.subdomain_count,
            expires_at: expiresAt,
            permissions
          };
        } else if (card.card_type === 'renew') {
          // 续期卡密：延长现有权限的有效期
          const renewStmt = db.prepare(`
            UPDATE user_domains
            SET expires_at = datetime(expires_at, '+' || ? || ' days')
            WHERE user_id = ? AND status = 'active'
          `);
          const renewResult = renewStmt.run(card.validity_days, userId);

          if (renewResult.changes === 0) {
            throw new Error('没有找到可续期的权限记录');
          }

          console.log('续期权限结果:', renewResult);
          return {
            type: 'renew',
            renewed_count: renewResult.changes,
            validity_days: card.validity_days
          };
        } else {
          throw new Error('未知的卡密类型');
        }
      });

      return transaction();
    } catch (error) {
      console.error('使用卡密错误:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const stmt = db.prepare(`DELETE FROM cards WHERE id = ?`);
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Card;
