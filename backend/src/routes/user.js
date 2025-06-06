const express = require('express');
const {
  UserController,
  redeemCardValidation,
  renewHostnameValidation,
  addHostnameValidation,
  editIPValidation
} = require('../controllers/userController');
const { verifyToken, checkUserStatus } = require('../middleware/auth');

const router = express.Router();

// 应用中间件
router.use(verifyToken);
router.use(checkUserStatus);

// 卡密兑换
router.post('/redeem', redeemCardValidation, UserController.redeemCard);

// 主机名续期
router.post('/renew', renewHostnameValidation, UserController.renewHostname);

// 权限查询
router.get('/permissions', UserController.getUserPermissions);

// 域名管理
router.get('/domains', UserController.getAvailableDomains);
router.get('/hostnames', UserController.getUserHostnames);
router.post('/hostnames', addHostnameValidation, UserController.addCustomHostname);
router.get('/hostnames/:id/refresh', UserController.refreshHostnameStatus);
router.patch('/hostnames/:id/ip', editIPValidation, UserController.editHostnameIP);
router.delete('/hostnames/:id', UserController.deleteHostname);

module.exports = router;
