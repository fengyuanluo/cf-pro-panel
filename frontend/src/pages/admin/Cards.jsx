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
  Select,
  message,
  Tag,
  Popconfirm,
  Typography,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../../services/api';
import { formatDate, getStatusColor } from '../../utils/auth';
import { copyToClipboard } from '../../utils/clipboard';

const { Title } = Typography;

const Cards = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取卡密列表
  const { data: cardsData, isLoading } = useQuery('adminCards', adminAPI.getCards);

  // 生成卡密
  const generateCardsMutation = useMutation(adminAPI.generateCards, {
    onSuccess: (data) => {
      message.success(`成功生成 ${data.cards.length} 张卡密`);
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries('adminCards');
    },
    onError: (error) => {
      message.error(`生成失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 删除卡密
  const deleteCardMutation = useMutation(adminAPI.deleteCard, {
    onSuccess: () => {
      message.success('卡密删除成功');
      queryClient.invalidateQueries('adminCards');
    },
    onError: (error) => {
      message.error(`删除失败: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleGenerateCards = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      await generateCardsMutation.mutateAsync(values);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCardMutation.mutateAsync(id);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleCopyCard = (cardCode) => {
    copyToClipboard(cardCode, '卡密已复制到剪贴板');
  };

  const handleExportCards = () => {
    const cards = cardsData?.cards || [];
    const unusedCards = cards.filter(card => card.status === 'unused');

    if (unusedCards.length === 0) {
      message.warning('没有可导出的未使用卡密');
      return;
    }

    const content = unusedCards.map(card =>
      `${card.card_code} | ${card.subdomain_count}个子域名 | ${card.validity_days}天有效期`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cards_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    message.success('卡密导出成功');
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '卡密代码',
      dataIndex: 'card_code',
      key: 'card_code',
      render: (text) => (
        <Space>
          <code>{text}</code>
          <Tooltip title="复制卡密">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyCard(text)}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: '卡密类型',
      dataIndex: 'card_type',
      key: 'card_type',
      render: (type) => (
        <Tag color={type === 'create' ? 'blue' : 'green'}>
          {type === 'create' ? '创建卡密' : '续期卡密'}
        </Tag>
      )
    },
    {
      title: '子域名数量',
      dataIndex: 'subdomain_count',
      key: 'subdomain_count'
    },
    {
      title: '有效期(天)',
      dataIndex: 'validity_days',
      key: 'validity_days'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status === 'unused' ? '未使用' : '已使用'}
        </Tag>
      )
    },
    {
      title: '使用者',
      dataIndex: 'used_by_username',
      key: 'used_by_username',
      render: (text) => text || '-'
    },
    {
      title: '使用时间',
      dataIndex: 'used_at',
      key: 'used_at',
      render: (text) => text ? formatDate(text) : '-'
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
            title="确定要删除这个卡密吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deleteCardMutation.isLoading}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const cards = cardsData?.cards || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>卡密管理</Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportCards}
          >
            导出卡密
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleGenerateCards}
          >
            生成卡密
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={cards}
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
        title="生成卡密"
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
            name="card_type"
            label="卡密类型"
            rules={[{ required: true, message: '请选择卡密类型' }]}
            initialValue="create"
          >
            <Select placeholder="请选择卡密类型">
              <Select.Option value="create">创建卡密 - 创建新的主机名额度</Select.Option>
              <Select.Option value="renew">续期卡密 - 延长现有权限有效期</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subdomain_count"
            label="子域名数量"
            rules={[
              { required: true, message: '请输入子域名数量' },
              { type: 'number', min: 1, message: '子域名数量必须大于0' }
            ]}
          >
            <InputNumber
              placeholder="请输入子域名数量"
              min={1}
              max={1000}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="validity_days"
            label="有效期(天)"
            rules={[
              { required: true, message: '请输入有效期' },
              { type: 'number', min: 1, message: '有效期必须大于0天' }
            ]}
          >
            <InputNumber
              placeholder="请输入有效期天数"
              min={1}
              max={3650}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="生成数量"
            rules={[
              { required: true, message: '请输入生成数量' },
              { type: 'number', min: 1, max: 100, message: '生成数量1-100张' }
            ]}
          >
            <InputNumber
              placeholder="请输入生成数量"
              min={1}
              max={100}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={generateCardsMutation.isLoading}
              >
                生成卡密
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

export default Cards;
