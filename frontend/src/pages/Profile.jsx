import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography, Divider, Space, Tag } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, CalendarOutlined } from '@ant-design/icons';
import { authAPI } from '../services/api';
import { getCurrentUser } from '../utils/auth';

const { Title, Text } = Typography;

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await authAPI.getProfile();
      setUserInfo(response.user);
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const handleChangePassword = async (values) => {
    setPasswordLoading(true);
    try {
      await authAPI.changePassword(values);
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      console.error('修改密码失败:', error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleTag = (role) => {
    const roleConfig = {
      admin: { color: 'red', text: '管理员' },
      user: { color: 'blue', text: '普通用户' }
    };
    const config = roleConfig[role] || { color: 'default', text: role };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      active: { color: 'green', text: '正常' },
      disabled: { color: 'red', text: '禁用' }
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Title level={2}>个人信息</Title>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本信息 */}
        <Card title="基本信息" className="h-fit">
          {userInfo && (
            <Space direction="vertical" size="middle" className="w-full">
              <div className="flex items-center justify-between">
                <Text strong>用户名:</Text>
                <Space>
                  <UserOutlined />
                  <Text>{userInfo.username}</Text>
                </Space>
              </div>
              
              <div className="flex items-center justify-between">
                <Text strong>邮箱:</Text>
                <Space>
                  <MailOutlined />
                  <Text>{userInfo.email || '未设置'}</Text>
                </Space>
              </div>
              
              <div className="flex items-center justify-between">
                <Text strong>角色:</Text>
                {getRoleTag(userInfo.role)}
              </div>
              
              <div className="flex items-center justify-between">
                <Text strong>状态:</Text>
                {getStatusTag(userInfo.status)}
              </div>
              
              <div className="flex items-center justify-between">
                <Text strong>注册时间:</Text>
                <Space>
                  <CalendarOutlined />
                  <Text>{new Date(userInfo.created_at).toLocaleString()}</Text>
                </Space>
              </div>
            </Space>
          )}
        </Card>

        {/* 修改密码 */}
        <Card title="修改密码">
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
            autoComplete="off"
          >
            <Form.Item
              name="currentPassword"
              label="当前密码"
              rules={[
                { required: true, message: '请输入当前密码' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入当前密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6位' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请确认新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={passwordLoading}
                size="large"
                className="w-full"
              >
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
