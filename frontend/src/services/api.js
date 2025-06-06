import axios from 'axios';
import { message } from 'antd';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;

    if (response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      message.error('登录已过期，请重新登录');
    } else if (response?.status === 403) {
      const errorData = response.data;
      if (errorData?.code === 'PERMISSION_IN_USE') {
        message.error(errorData.error, 6); // 显示6秒
      } else {
        message.error(errorData?.error || '权限不足');
      }
    } else if (response?.status === 400) {
      const errorData = response.data;
      // 根据错误代码显示不同的提示时长
      const duration = getErrorDuration(errorData?.code);
      message.error(errorData?.error || '请求参数错误', duration);
    } else if (response?.status === 404) {
      const errorData = response.data;
      message.error(errorData?.error || '请求的资源不存在');
    } else if (response?.status >= 500) {
      message.error('服务器错误，请稍后重试');
    } else if (response?.data?.error) {
      message.error(response.data.error);
    } else {
      message.error('网络错误，请检查网络连接');
    }

    return Promise.reject(error);
  }
);

// 根据错误代码返回合适的显示时长
function getErrorDuration(code) {
  const longDurationCodes = [
    'NO_PERMISSIONS',
    'PERMISSIONS_EXPIRED',
    'QUOTA_EXHAUSTED',
    'DOMAIN_LIMIT_EXCEEDED',
    'PERMISSION_IN_USE'
  ];

  return longDurationCodes.includes(code) ? 6 : 4;
}

// 认证相关API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// 用户相关API
export const userAPI = {
  redeemCard: (data) => api.post('/user/redeem', data),
  renewHostname: (data) => api.post('/user/renew', data),
  getPermissions: () => api.get('/user/permissions'),
  getDomains: () => api.get('/user/domains'),
  getHostnames: () => api.get('/user/hostnames'),
  addHostname: (data) => api.post('/user/hostnames', data),
  refreshHostname: (id) => api.get(`/user/hostnames/${id}/refresh`),
  editHostnameIP: (id, data) => api.patch(`/user/hostnames/${id}/ip`, data),
  deleteHostname: (id) => api.delete(`/user/hostnames/${id}`),
};

// 管理员相关API
export const adminAPI = {
  // 用户管理
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUserStatus: (id, data) => api.patch(`/admin/users/${id}/status`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // 域名管理
  getDomains: () => api.get('/admin/domains'),
  addDomain: (data) => api.post('/admin/domains', data),
  deleteDomain: (id) => api.delete(`/admin/domains/${id}`),

  // 卡密管理
  getCards: () => api.get('/admin/cards'),
  generateCards: (data) => api.post('/admin/cards', data),
  deleteCard: (id) => api.delete(`/admin/cards/${id}`),

  // 权限管理
  adjustPermissions: (data) => api.post('/admin/permissions', data),
  getUserAllPermissions: (userId) => api.get(`/admin/permissions/${userId}`),
  deleteUserPermission: (permissionId) => api.delete(`/admin/permissions/${permissionId}`),

  // 自定义主机名管理
  getAllHostnames: () => api.get('/admin/hostnames'),
  deleteUserHostname: (id) => api.delete(`/admin/hostnames/${id}`),

  // 系统维护
  manualCleanup: () => api.post('/admin/cleanup'),
};

export default api;
