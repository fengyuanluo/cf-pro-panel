const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

class AuthController {
  // 用户登录
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { username, password } = req.body;

      // 查找用户
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      // 验证密码
      const isValidPassword = await User.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      // 检查用户状态
      if (user.status !== 'active') {
        return res.status(403).json({ error: '账户已被禁用' });
      }

      // 生成token
      const token = generateToken(user);

      res.json({
        message: '登录成功',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({ error: '登录失败' });
    }
  }

  // 用户注册
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { username, password, email } = req.body;

      // 检查用户名是否已存在
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      // 创建用户
      const user = await User.create({ username, password, email });

      res.status(201).json({
        message: '注册成功',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({ error: '注册失败' });
    }
  }

  // 获取当前用户信息
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({ error: '获取用户信息失败' });
    }
  }

  // 修改密码
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '输入验证失败', details: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // 获取用户信息
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      // 验证当前密码
      const isValidPassword = await User.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: '当前密码错误' });
      }

      // 更新密码
      const success = await User.updatePassword(userId, newPassword);
      if (!success) {
        return res.status(500).json({ error: '密码更新失败' });
      }

      res.json({ message: '密码修改成功' });
    } catch (error) {
      console.error('修改密码错误:', error);
      res.status(500).json({ error: '修改密码失败' });
    }
  }
}

// 验证规则
const loginValidation = [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位')
];

const registerValidation = [
  body('username').isLength({ min: 3, max: 20 }).withMessage('用户名长度3-20位'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('请输入当前密码'),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('确认密码与新密码不一致');
    }
    return true;
  })
];

module.exports = {
  AuthController,
  loginValidation,
  registerValidation,
  changePasswordValidation
};
