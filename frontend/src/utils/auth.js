// 获取当前用户信息
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 设置用户信息
export const setCurrentUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// 获取token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 设置token
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// 清除认证信息
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// 检查是否已登录
export const isAuthenticated = () => {
  return !!getToken();
};

// 检查是否是管理员
export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

// 格式化日期
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN');
};

// 格式化状态
export const formatStatus = (status) => {
  const statusMap = {
    active: '正常',
    inactive: '禁用',
    pending: '待验证',
    expired: '已过期',
    used: '已使用',
    unused: '未使用'
  };
  return statusMap[status] || status;
};

// 获取状态颜色
export const getStatusColor = (status) => {
  const colorMap = {
    active: 'success',
    inactive: 'error',
    pending: 'warning',
    expired: 'error',
    used: 'success',
    unused: 'default'
  };
  return colorMap[status] || 'default';
};
