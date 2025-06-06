import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Popconfirm,
  Typography
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  GlobalOutlined,
  CopyOutlined,
  SettingOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../../services/api';
import { formatDate, getStatusColor } from '../../utils/auth';
import { copyToClipboard } from '../../utils/clipboard';
import UserPermissions from '../../components/UserPermissions';

const { Title } = Typography;
const { Option } = Select;

const Users = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取用户列表
  const { data: usersData, isLoading } = useQuery('adminUsers', adminAPI.getUsers);

  // 获取所有主机名
  const { data: hostnamesData } = useQuery('adminHostnames', adminAPI.getAllHostnames);

  // 创建用户
  const createUserMutation = useMutation(adminAPI.createUser, {
    onSuccess: () => {
      message.success('用户创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries('adminUsers');
    },
    onError: (error) => {
      message.error(`创建失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 更新用户状态
  const updateStatusMutation = useMutation(
    ({ id, status }) => adminAPI.updateUserStatus(id, { status }),
    {
      onSuccess: () => {
        message.success('状态更新成功');
        queryClient.invalidateQueries('adminUsers');
      },
      onError: (error) => {
        message.error(`更新失败: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // 删除用户
  const deleteUserMutation = useMutation(adminAPI.deleteUser, {
    onSuccess: () => {
      message.success('用户删除成功');
      queryClient.invalidateQueries('adminUsers');
    },
    onError: (error) => {
      message.error(`删除失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 删除主机名
  const deleteHostnameMutation = useMutation(adminAPI.deleteUserHostname, {
    onSuccess: () => {
      message.success('主机名删除成功');
      queryClient.invalidateQueries('adminHostnames');
    },
    onError: (error) => {
      message.error(`删除失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 手动清理
  const cleanupMutation = useMutation(adminAPI.manualCleanup, {
    onSuccess: () => {
      message.success('清理任务执行完成');
      queryClient.invalidateQueries('adminHostnames');
      queryClient.invalidateQueries('adminUsers');
    },
    onError: (error) => {
      message.error(`清理任务失败: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleCreateUser = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      await createUserMutation.mutateAsync(values);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status });
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUserMutation.mutateAsync(id);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleManagePermissions = (user) => {
    setSelectedUser(user);
    setPermissionsModalVisible(true);
  };

  const handleClosePermissions = () => {
    setPermissionsModalVisible(false);
    setSelectedUser(null);
  };

  const handleManualCleanup = async () => {
    try {
      await cleanupMutation.mutateAsync();
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleDeleteHostname = async (id) => {
    try {
      await deleteHostnameMutation.mutateAsync(id);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };



  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text) => text || '-'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status === 'active' ? '正常' : '禁用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => formatDate(text)
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<SettingOutlined />}
            onClick={() => handleManagePermissions(record)}
            title="权限管理"
          >
            权限
          </Button>
          {record.status === 'active' ? (
            <Button
              type="link"
              danger
              onClick={() => handleStatusChange(record.id, 'inactive')}
              loading={updateStatusMutation.isLoading}
            >
              禁用
            </Button>
          ) : (
            <Button
              type="link"
              onClick={() => handleStatusChange(record.id, 'active')}
              loading={updateStatusMutation.isLoading}
            >
              启用
            </Button>
          )}
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deleteUserMutation.isLoading}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const users = usersData?.users || [];
  const hostnames = hostnamesData?.hostnames || [];

  // 按用户分组主机名
  const hostnamesByUser = hostnames.reduce((acc, hostname) => {
    if (!acc[hostname.user_id]) {
      acc[hostname.user_id] = [];
    }
    acc[hostname.user_id].push(hostname);
    return acc;
  }, {});

  // 渲染主机名详情
  const renderHostnameDetails = (hostname) => (
    <div className="bg-gray-50 p-4 rounded border">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-800">{hostname.custom_hostname}</h4>
          <p className="text-sm text-gray-600">目标: {hostname.subdomain} → {hostname.target_ip}</p>
          <p className="text-sm text-gray-500">域名: {hostname.domain}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Tag color={hostname.status === 'active' ? 'green' : 'orange'}>
            {hostname.status === 'active' ? '已激活' : '待验证'}
          </Tag>
          <Popconfirm
            title="确定要删除这个主机名吗？"
            onConfirm={() => handleDeleteHostname(hostname.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={deleteHostnameMutation.isLoading}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      </div>

      {/* 验证信息 - 2x2布局 */}
      <div className="grid grid-cols-2 gap-4 mt-3">
        {/* 证书验证TXT */}
        {hostname.verification_txt_name && hostname.verification_txt_name.trim() ? (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-sm font-semibold text-blue-800">🔐 证书验证 TXT</h5>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-blue-600 flex items-center justify-between">
                <div className="flex-1">
                  <strong>名称:</strong>
                  <code className="ml-1 bg-blue-100 px-1 rounded text-xs">{hostname.verification_txt_name}</code>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(hostname.verification_txt_name, '证书验证TXT名称已复制')}
                  className="ml-2"
                />
              </div>
              <div className="text-xs text-blue-600 flex items-center justify-between">
                <div className="flex-1">
                  <strong>值:</strong>
                  <code className="ml-1 bg-blue-100 px-1 rounded text-xs break-all">{hostname.verification_txt_value}</code>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(hostname.verification_txt_value, '证书验证TXT值已复制')}
                  className="ml-2"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-3 rounded border border-gray-200 flex items-center justify-center">
            <div className="text-gray-500 text-sm text-center">
              <p>🔐 证书验证 TXT</p>
              <p className="text-xs">暂未生成，请刷新状态</p>
            </div>
          </div>
        )}

        {/* 主机名验证TXT */}
        {hostname.hostname_txt_name && hostname.hostname_txt_name.trim() ? (
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-sm font-semibold text-green-800">🌐 主机名验证 TXT</h5>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-green-600 flex items-center justify-between">
                <div className="flex-1">
                  <strong>名称:</strong>
                  <code className="ml-1 bg-green-100 px-1 rounded text-xs">{hostname.hostname_txt_name}</code>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(hostname.hostname_txt_name, '主机名验证TXT名称已复制')}
                  className="ml-2"
                />
              </div>
              <div className="text-xs text-green-600 flex items-center justify-between">
                <div className="flex-1">
                  <strong>值:</strong>
                  <code className="ml-1 bg-green-100 px-1 rounded text-xs break-all">{hostname.hostname_txt_value}</code>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(hostname.hostname_txt_value, '主机名验证TXT值已复制')}
                  className="ml-2"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-3 rounded border border-gray-200 flex items-center justify-center">
            <div className="text-gray-500 text-sm text-center">
              <p>🌐 主机名验证 TXT</p>
              <p className="text-xs">暂未生成，请刷新状态</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 可展开行渲染
  const expandedRowRender = (record) => {
    const userHostnames = hostnamesByUser[record.id] || [];

    if (userHostnames.length === 0) {
      return (
        <div className="text-gray-500 text-center py-4">
          该用户暂无自定义主机名
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {userHostnames.map(hostname => (
          <div key={hostname.id}>
            {renderHostnameDetails(hostname)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>用户管理</Title>
        <Space>
          <Popconfirm
            title="确定要执行清理任务吗？"
            description="将清理过期的主机名和被禁用用户的资源"
            onConfirm={handleManualCleanup}
            okText="确定"
            cancelText="取消"
          >
            <Button
              icon={<ClearOutlined />}
              loading={cleanupMutation.isLoading}
            >
              清理任务
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateUser}
          >
            创建用户
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          expandable={{
            expandedRowRender,
            expandIcon: ({ expanded, onExpand, record }) => {
              const userHostnames = hostnamesByUser[record.id] || [];
              return (
                <Button
                  type="text"
                  size="small"
                  icon={<GlobalOutlined />}
                  onClick={e => onExpand(record, e)}
                  className={expanded ? 'text-blue-600' : 'text-gray-400'}
                >
                  {userHostnames.length}
                </Button>
              );
            },
            rowExpandable: (record) => {
              const userHostnames = hostnamesByUser[record.id] || [];
              return userHostnames.length > 0;
            }
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      <Modal
        title="创建用户"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度3-20位' }
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱（可选）" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            initialValue="user"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createUserMutation.isLoading}
              >
                创建用户
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限管理组件 */}
      <UserPermissions
        userId={selectedUser?.id}
        username={selectedUser?.username}
        visible={permissionsModalVisible}
        onClose={handleClosePermissions}
      />
    </div>
  );
};

export default Users;
