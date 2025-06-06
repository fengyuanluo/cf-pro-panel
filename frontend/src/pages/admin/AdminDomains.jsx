import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Tag,
  Popconfirm,
  Typography
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CloudOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../../services/api';
import { formatDate, getStatusColor } from '../../utils/auth';

const { Title } = Typography;

const AdminDomains = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取域名列表
  const { data: domainsData, isLoading } = useQuery('adminDomains', adminAPI.getDomains);

  // 添加域名
  const addDomainMutation = useMutation(adminAPI.addDomain, {
    onSuccess: () => {
      message.success('域名添加成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries('adminDomains');
    },
    onError: (error) => {
      message.error(`添加失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 删除域名
  const deleteDomainMutation = useMutation(adminAPI.deleteDomain, {
    onSuccess: () => {
      message.success('域名删除成功');
      queryClient.invalidateQueries('adminDomains');
    },
    onError: (error) => {
      message.error(`删除失败: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleAddDomain = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      // 确保 max_hostnames 是数字类型
      const submitData = {
        ...values,
        max_hostnames: Number(values.max_hostnames)
      };
      await addDomainMutation.mutateAsync(submitData);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDomainMutation.mutateAsync(id);
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
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      render: (text) => <strong>{text}</strong>
    },

    {
      title: '邮箱',
      dataIndex: 'cf_email',
      key: 'cf_email',
      render: (text) => text || '-'
    },
    {
      title: '主机名限制',
      dataIndex: 'max_hostnames',
      key: 'max_hostnames',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>
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
          <Popconfirm
            title="确定要删除这个域名吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deleteDomainMutation.isLoading}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const domains = domainsData?.domains || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>域名管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddDomain}
        >
          添加域名
        </Button>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={domains}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      <Modal
        title="添加合租域名"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="domain"
            label="域名"
            rules={[
              { required: true, message: '请输入域名' },
              { pattern: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/, message: '请输入有效的域名' }
            ]}
          >
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item
            name="cf_api_key"
            label="Cloudflare API Key"
            rules={[{ required: true, message: '请输入CF API Key' }]}
          >
            <Input.Password placeholder="请输入Cloudflare API Key" />
          </Form.Item>

          <Form.Item
            name="cf_email"
            label="Cloudflare 邮箱"
            rules={[
              { required: true, message: '请输入CF邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入Cloudflare账户邮箱地址" />
          </Form.Item>

          <Form.Item
            name="max_hostnames"
            label="最大主机名数量"
            initialValue={100}
            rules={[
              { required: true, message: '请输入最大主机名数量' },
              { type: 'number', min: 1, max: 10000, message: '数量必须在1-10000之间' }
            ]}
          >
            <InputNumber
              min={1}
              max={10000}
              placeholder="100"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={addDomainMutation.isLoading}
              >
                添加域名
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDomains;
