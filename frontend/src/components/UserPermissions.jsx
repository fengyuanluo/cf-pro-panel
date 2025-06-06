import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Tag,
  Popconfirm,
  Typography,
  Statistic,
  Row,
  Col,
  Divider
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../services/api';
import { formatDate } from '../utils/auth';

const { Title, Text } = Typography;

const UserPermissions = ({ userId, username, visible, onClose }) => {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取用户权限
  const { data: permissionsData, isLoading } = useQuery(
    ['userPermissions', userId],
    () => adminAPI.getUserAllPermissions(userId),
    {
      enabled: visible && !!userId
    }
  );

  // 添加权限
  const addPermissionMutation = useMutation(adminAPI.adjustPermissions, {
    onSuccess: () => {
      message.success('权限添加成功');
      setIsAddModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries(['userPermissions', userId]);
    },
    onError: (error) => {
      message.error(`添加失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 删除权限
  const deletePermissionMutation = useMutation(adminAPI.deleteUserPermission, {
    onSuccess: () => {
      message.success('权限删除成功');
      queryClient.invalidateQueries(['userPermissions', userId]);
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.code === 'PERMISSION_IN_USE') {
        message.error(errorData.error, 8); // 显示8秒，因为信息较长
      } else {
        message.error(`删除失败: ${errorData?.error || error.message}`);
      }
    }
  });

  const handleAddPermission = () => {
    setIsAddModalVisible(true);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      await addPermissionMutation.mutateAsync({
        user_id: userId,
        ...values
      });
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleDeletePermission = async (permissionId) => {
    try {
      await deletePermissionMutation.mutateAsync(permissionId);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const getPermissionStatus = (permission) => {
    const now = new Date();
    const expiresAt = new Date(permission.expires_at);
    const isExpired = expiresAt < now;
    const hasUsage = permission.used_count > 0;

    if (isExpired) {
      return { status: 'expired', color: 'default', text: '已过期' };
    } else if (hasUsage) {
      return { status: 'active', color: 'success', text: '使用中' };
    } else {
      return { status: 'unused', color: 'processing', text: '未使用' };
    }
  };

  const columns = [
    {
      title: '权限ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '主机名额度',
      dataIndex: 'subdomain_count',
      key: 'subdomain_count',
      render: (count, record) => (
        <Space>
          <Text strong>{count}</Text>
          <Text type="secondary">个</Text>
        </Space>
      )
    },
    {
      title: '使用状态',
      key: 'usage',
      render: (_, record) => {
        const isUsed = record.is_used === 1;
        const boundHostname = record.bound_hostname;
        return (
          <Space direction="vertical" size={0}>
            <Tag color={isUsed ? 'orange' : 'green'}>
              {isUsed ? '已使用' : '未使用'}
            </Tag>
            {boundHostname && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                绑定: {boundHostname}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: '绑定的主机名',
      key: 'bound_hostnames',
      render: (_, record) => {
        const hostnames = record.bound_hostnames || [];
        if (hostnames.length === 0) {
          return <Text type="secondary">无</Text>;
        }

        return (
          <div>
            {hostnames.map((hostname, index) => (
              <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                {hostname}
              </Tag>
            ))}
          </div>
        );
      }
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (text) => {
        const expiresAt = new Date(text);
        const now = new Date();
        const isExpired = expiresAt < now;

        return (
          <Space>
            <Text type={isExpired ? 'danger' : 'default'}>
              {formatDate(text)}
            </Text>
            {isExpired && <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
          </Space>
        );
      }
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const { status, color, text } = getPermissionStatus(record);
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const isUsed = record.is_used === 1;
        const boundHostname = record.bound_hostname;

        return (
          <Space>
            <Popconfirm
              title="确定要删除这个权限记录吗？"
              description={
                <div>
                  {isUsed ? (
                    <div>
                      <p>此权限已绑定主机名: {boundHostname}</p>
                      <p>删除权限将同时删除绑定的主机名</p>
                      <p style={{ color: '#ff4d4f' }}>此操作不可恢复！</p>
                    </div>
                  ) : (
                    <div>
                      <p>此权限未使用，可以安全删除</p>
                      <p>删除后无法恢复</p>
                    </div>
                  )}
                  <p>权限信息：{record.subdomain_count}个主机名额度</p>
                </div>
              }
              onConfirm={() => handleDeletePermission(record.id)}
              okText="确定删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                size="small"
                loading={deletePermissionMutation.isLoading}
                disabled={isUsed} // 已使用的权限暂时禁用删除
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  const permissions = permissionsData?.permissions || [];
  const stats = permissionsData?.stats || {};

  // 计算基于新的一对一关系的统计信息
  const actualStats = permissions.reduce((acc, permission) => {
    const isUsed = permission.is_used === 1;
    const total = Number(permission.subdomain_count) || 0;

    acc.total_count += total;
    if (isUsed) {
      acc.used_count += total;
    } else {
      acc.available_count += total;
    }

    return acc;
  }, { total_count: 0, used_count: 0, available_count: 0 });

  // 确保统计数据都是有效数字
  const safeStats = {
    total_count: Number.isFinite(actualStats.total_count) ? actualStats.total_count : 0,
    used_count: Number.isFinite(actualStats.used_count) ? actualStats.used_count : 0,
    available_count: Number.isFinite(actualStats.available_count) ? actualStats.available_count : 0
  };

  return (
    <>
      <Modal
        title={`${username} 的权限管理`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        <div className="space-y-4">
          {/* 统计信息 */}
          <Card size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="总额度"
                  value={safeStats.total_count}
                  suffix="个"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已使用"
                  value={safeStats.used_count}
                  suffix="个"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="可用"
                  value={safeStats.available_count}
                  suffix="个"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddPermission}
                  block
                >
                  添加权限
                </Button>
              </Col>
            </Row>
          </Card>

          <Divider />

          {/* 权限列表 */}
          <Table
            columns={columns}
            dataSource={permissions}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{
              pageSize: 5,
              showSizeChanger: false,
              showQuickJumper: false,
              showTotal: (total) => `共 ${total} 条权限记录`
            }}
          />
        </div>
      </Modal>

      {/* 添加权限模态框 */}
      <Modal
        title="添加用户权限"
        open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="主机名数量"
            name="subdomain_count"
            rules={[
              { required: true, message: '请输入主机名数量' },
              { type: 'number', min: 1, max: 100, message: '数量必须在1-100之间' }
            ]}
          >
            <InputNumber
              min={1}
              max={100}
              placeholder="请输入主机名数量"
              style={{ width: '100%' }}
              addonAfter="个"
            />
          </Form.Item>

          <Form.Item
            label="有效期"
            name="validity_days"
            rules={[
              { required: true, message: '请输入有效期' },
              { type: 'number', min: 1, max: 365, message: '有效期必须在1-365天之间' }
            ]}
          >
            <InputNumber
              min={1}
              max={365}
              placeholder="请输入有效期"
              style={{ width: '100%' }}
              addonAfter="天"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={addPermissionMutation.isLoading}
              >
                添加权限
              </Button>
              <Button onClick={() => setIsAddModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UserPermissions;
