
import { Row, Col, Card, Statistic, Typography, Space, Button } from 'antd';
import {
  CloudOutlined,
  CreditCardOutlined,
  GlobalOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { getCurrentUser } from '../utils/auth';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  // 获取用户权限信息
  const { data: permissions, isLoading: permissionsLoading } = useQuery(
    'userPermissions',
    userAPI.getPermissions
  );

  // 获取用户域名列表
  const { data: hostnames, isLoading: hostnamesLoading } = useQuery(
    'userHostnames',
    userAPI.getHostnames
  );

  const stats = permissions?.stats || {};
  const hostnameList = hostnames?.hostnames || [];

  const quickActions = [
    {
      title: '兑换卡密',
      description: '使用卡密获取子域名权限',
      icon: <CreditCardOutlined className="text-2xl text-blue-500" />,
      action: () => navigate('/redeem'),
    },
    {
      title: '添加域名',
      description: '接入新的自定义域名',
      icon: <PlusOutlined className="text-2xl text-green-500" />,
      action: () => navigate('/domains'),
    },
    {
      title: '管理域名',
      description: '查看和管理已接入的域名',
      icon: <GlobalOutlined className="text-2xl text-purple-500" />,
      action: () => navigate('/domains'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎信息 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <Title level={2} className="!text-white !mb-2">
          欢迎回来，{user?.username}！
        </Title>
        <Text className="text-blue-100">
          管理您的Cloudflare自定义域名，享受专业的CDN服务
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card loading={permissionsLoading}>
            <Statistic
              title="总权限数量"
              value={Number.isFinite(stats.total_count) ? stats.total_count : 0}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={permissionsLoading}>
            <Statistic
              title="已使用"
              value={Number.isFinite(stats.used_count) ? stats.used_count : 0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={permissionsLoading}>
            <Statistic
              title="可用数量"
              value={Number.isFinite(stats.available_count) ? stats.available_count : 0}
              prefix={<PlusOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷操作 */}
      <Card title="快捷操作" className="card-shadow">
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} md={8} key={index}>
              <Card
                hoverable
                className="text-center h-full"
                onClick={action.action}
              >
                <Space direction="vertical" size="middle" className="w-full">
                  {action.icon}
                  <div>
                    <Title level={4} className="!mb-1">{action.title}</Title>
                    <Text type="secondary">{action.description}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 最近的域名 */}
      <Card
        title="最近接入的域名"
        className="card-shadow"
        extra={
          <Button type="link" onClick={() => navigate('/domains')}>
            查看全部
          </Button>
        }
      >
        {hostnamesLoading ? (
          <div className="text-center py-8">
            <Text type="secondary">加载中...</Text>
          </div>
        ) : hostnameList.length > 0 ? (
          <div className="space-y-3">
            {hostnameList.slice(0, 5).map((hostname) => (
              <div
                key={hostname.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <Text strong>{hostname.custom_hostname}</Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    {hostname.target_ip} → {hostname.subdomain}
                  </Text>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-2 py-1 rounded text-xs ${
                    hostname.status === 'active' ? 'bg-green-100 text-green-800' :
                    hostname.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {hostname.status === 'active' ? '正常' :
                     hostname.status === 'pending' ? '待验证' : '异常'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Text type="secondary">暂无域名，点击上方快捷操作开始使用</Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
