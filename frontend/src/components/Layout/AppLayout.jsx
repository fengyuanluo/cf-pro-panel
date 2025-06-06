import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Space, Typography } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  CloudOutlined,
  CreditCardOutlined,
  TeamOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, clearAuth, isAdmin } from '../../utils/auth';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  // 菜单项
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/domains',
      icon: <GlobalOutlined />,
      label: '域名管理',
    },
    {
      key: '/redeem',
      icon: <CreditCardOutlined />,
      label: '卡密兑换',
    },
  ];

  // 管理员菜单
  if (isAdmin()) {
    menuItems.push(
      {
        key: '/admin',
        icon: <SettingOutlined />,
        label: '系统管理',
        children: [
          {
            key: '/admin/users',
            label: '用户管理',
            icon: <TeamOutlined />,
          },
          {
            key: '/admin/domains',
            label: '域名管理',
            icon: <CloudOutlined />,
          },
          {
            key: '/admin/cards',
            label: '卡密管理',
            icon: <CreditCardOutlined />,
          },
        ],
      }
    );
  }

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') {
      clearAuth();
      navigate('/login');
    } else if (key === 'profile') {
      // 处理个人信息
    }
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="shadow-lg"
        theme="light"
      >
        <div className="p-4 text-center border-b">
          <Title level={collapsed ? 5 : 4} className="!mb-0 gradient-text">
            {collapsed ? 'CF' : 'CF Pro Panel'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-r-0"
        />
      </Sider>

      <Layout>
        <Header className="bg-white shadow-sm px-4 flex items-center justify-between">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg"
          />

          <Space>
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <Space className="cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                <Avatar icon={<UserOutlined />} />
                <span className="font-medium">{user?.username}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content className="m-6 p-6 bg-white rounded-lg shadow-sm min-h-[calc(100vh-112px)]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
