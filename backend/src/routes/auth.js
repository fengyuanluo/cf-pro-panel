const express = require('express');
const { AuthController, loginValidation, registerValidation, changePasswordValidation } = require('../controllers/authController');
const { verifyToken, checkUserStatus } = require('../middleware/auth');

const router = express.Router();

// 用户登录
router.post('/login', loginValidation, AuthController.login);

// 用户注册
router.post('/register', registerValidation, AuthController.register);

// 获取当前用户信息
router.get('/profile', verifyToken, checkUserStatus, AuthController.getProfile);

// 修改密码
router.post('/change-password', verifyToken, checkUserStatus, changePasswordValidation, AuthController.changePassword);

module.exports = router;
