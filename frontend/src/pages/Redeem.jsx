
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Divider,
  Row,
  Col,
  Statistic,
  Table
} from 'antd';
import {
  CreditCardOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { userAPI } from '../services/api';
import { formatDate } from '../utils/auth';

const { Title, Text, Paragraph } = Typography;

const Redeem = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取用户权限信息
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery(
    'userPermissions',
    userAPI.getPermissions
  );

  // 兑换卡密
  const redeemMutation = useMutation(userAPI.redeemCard, {
    onSuccess: (data) => {
      message.success('卡密兑换成功！');
      form.resetFields();
      queryClient.invalidateQueries('userPermissions');
    },
    onError: (error) => {
      message.error(`兑换失败: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleRedeem = async (values) => {
    try {
      await redeemMutation.mutateAsync(values);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const permissions = permissionsData?.permissions || [];
  const stats = permissionsData?.stats || {};

  const permissionColumns = [
    {
      title: '子域名数量',
      dataIndex: 'subdomain_count',
      key: 'subdomain_count',
      render: (count) => <strong>{count || 0}</strong>
    },
    {
      title: '已使用',
      dataIndex: 'used_count',
      key: 'used_count',
      render: (count) => <span style={{ color: '#ff4d4f' }}>{count || 0}</span>
    },
    {
      title: '剩余',
      key: 'remaining',
      render: (_, record) => {
        const subdomainCount = record.subdomain_count || 0;
        const usedCount = record.used_count || 0;
        const remaining = subdomainCount - usedCount;
        return (
          <span style={{ color: '#52c41a' }}>
            {remaining >= 0 ? remaining : 0}
          </span>
        );
      }
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date) => {
        const isExpired = new Date(date) < new Date();
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : '#1890ff' }}>
            {formatDate(date)}
          </span>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const isExpired = new Date(record.expires_at) < new Date();
        if (isExpired) {
          return <span style={{ color: '#ff4d4f' }}>已过期</span>;
        }
        return status === 'active' ?
          <span style={{ color: '#52c41a' }}>正常</span> :
          <span style={{ color: '#faad14' }}>待激活</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <Title level={2}>卡密兑换</Title>

      {/* 统计信息 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总权限数量"
              value={Number.isFinite(stats.total_count) ? stats.total_count : 0}
              prefix={<GiftOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已使用"
              value={Number.isFinite(stats.used_count) ? stats.used_count : 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="可用数量"
              value={Number.isFinite(stats.available_count) ? stats.available_count : 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 兑换卡密 */}
      <Card title="兑换卡密" className="card-shadow">
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleRedeem}
            >
              <Form.Item
                name="card_code"
                label="卡密代码"
                rules={[
                  { required: true, message: '请输入卡密代码' },
                  { min: 10, message: '卡密代码长度不正确' }
                ]}
              >
                <Input.Password
                  placeholder="请输入卡密代码"
                  prefix={<CreditCardOutlined />}
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={redeemMutation.isLoading}
                  size="large"
                  block
                >
                  兑换卡密
                </Button>
              </Form.Item>
            </Form>
          </Col>

          <Col xs={24} md={12}>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Title level={4}>使用说明</Title>
              <Paragraph>
                <Text strong>1. 获取卡密：</Text>
                <br />
                联系管理员获取有效的卡密代码
              </Paragraph>
              <Paragraph>
                <Text strong>2. 兑换权限：</Text>
                <br />
                输入卡密代码并点击兑换，即可获得相应的子域名权限
              </Paragraph>
              <Paragraph>
                <Text strong>3. 使用权限：</Text>
                <br />
                兑换成功后，可在域名管理页面使用权限添加自定义域名
              </Paragraph>
              <Paragraph>
                <Text strong>4. 续期权限：</Text>
                <br />
                权限即将过期时，可在域名管理页面使用续期卡密延长有效期
              </Paragraph>
              <Paragraph>
                <Text strong>5. 注意事项：</Text>
                <br />
                • 每个卡密只能使用一次
                <br />
                • 权限有有效期限制，请及时使用
                <br />
                • 过期的权限将无法继续使用
                <br />
                • 创建卡密用于获取新权限，续期卡密用于延长现有权限
              </Paragraph>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 权限列表 */}
      <Card title="我的权限" className="card-shadow">
        <Table
          columns={permissionColumns}
          dataSource={permissions}
          rowKey="id"
          loading={permissionsLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          locale={{
            emptyText: '暂无权限记录，请先兑换卡密获取权限'
          }}
        />
      </Card>
    </div>
  );
};

export default Redeem;
