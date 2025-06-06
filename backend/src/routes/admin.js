const express = require('express');
const {
  AdminController,
  createUserValidation,
  addDomainValidation,
  generateCardsValidation,
  adjustPermissionsValidation
} = require('../controllers/adminController');
const { verifyToken, requireAdmin, checkUserStatus } = require('../middleware/auth');

const router = express.Router();

// 应用中间件
router.use(verifyToken);
router.use(checkUserStatus);
router.use(requireAdmin);

// 用户管理
router.get('/users', AdminController.getUsers);
router.post('/users', createUserValidation, AdminController.createUser);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.delete('/users/:id', AdminController.deleteUser);

// 域名管理
router.get('/domains', AdminController.getDomains);
router.post('/domains', addDomainValidation, AdminController.addDomain);
router.delete('/domains/:id', AdminController.deleteDomain);

// 卡密管理
router.get('/cards', AdminController.getCards);
router.post('/cards', generateCardsValidation, AdminController.generateCards);
router.delete('/cards/:id', AdminController.deleteCard);

// 权限管理
router.post('/permissions', adjustPermissionsValidation, AdminController.adjustUserPermissions);
router.get('/permissions/:user_id', AdminController.getUserAllPermissions);
router.delete('/permissions/:permission_id', AdminController.deleteUserPermission);

// 自定义主机名管理
router.get('/hostnames', AdminController.getAllHostnames);
router.delete('/hostnames/:id', AdminController.deleteUserHostname);
router.post('/hostnames/:id/repair', AdminController.repairHostname);

// 系统维护
router.post('/cleanup', AdminController.manualCleanup);

module.exports = router;
