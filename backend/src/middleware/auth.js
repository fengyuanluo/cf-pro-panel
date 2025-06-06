const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'cf-pro-panel-secret-key-2024';

// 生成JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 验证JWT token
function verifyToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '访问被拒绝，需要token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token无效' });
  }
}

// 验证管理员权限
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// 验证用户状态
async function checkUserStatus(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.status !== 'active') {
      return res.status(403).json({ error: '用户账户已被禁用' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: '验证用户状态失败' });
  }
}

module.exports = {
  generateToken,
  verifyToken,
  requireAdmin,
  checkUserStatus
};
