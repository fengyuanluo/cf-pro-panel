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
  ReloadOutlined,
  CopyOutlined,
  DownOutlined,
  ClockCircleOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userAPI } from '../services/api';
import { formatDate, getStatusColor } from '../utils/auth';
import styles from './Domains.module.css';
import { copyToClipboard } from '../utils/clipboard';

const { Title } = Typography;
const { Option } = Select;

const Domains = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRenewModalVisible, setIsRenewModalVisible] = useState(false);
  const [selectedHostname, setSelectedHostname] = useState(null);
  const [form] = Form.useForm();
  const [renewForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取可用域名列表
  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    'availableDomains',
    userAPI.getDomains
  );

  // 获取用户域名列表
  const { data: hostnamesData, isLoading: hostnamesLoading } = useQuery(
    'userHostnames',
    userAPI.getHostnames
  );

  // 添加域名
  const addDomainMutation = useMutation(userAPI.addHostname, {
    onSuccess: (data) => {
      message.success('域名添加成功，请查看验证信息完成DNS配置');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries('userHostnames');
    },
    onError: (error) => {
      message.error(`添加失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 删除域名
  const deleteDomainMutation = useMutation(userAPI.deleteHostname, {
    onSuccess: () => {
      message.success('域名删除成功');
      queryClient.invalidateQueries('userHostnames');
    },
    onError: (error) => {
      message.error(`删除失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 刷新状态
  const refreshStatusMutation = useMutation(userAPI.refreshHostname, {
    onSuccess: (data) => {
      message.success(`状态刷新成功: ${data.status_message || data.status}`);
      queryClient.invalidateQueries('userHostnames');
    },
    onError: (error) => {
      message.error(`刷新失败: ${error.response?.data?.error || error.message}`);
    }
  });

  // 续期主机名
  const renewHostnameMutation = useMutation(userAPI.renewHostname, {
    onSuccess: (data) => {
      message.success('主机名续期成功！');
      setIsRenewModalVisible(false);
      renewForm.resetFields();
      setSelectedHostname(null);
      queryClient.invalidateQueries('userHostnames');
    },
    onError: (error) => {
      message.error(`续期失败: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleAddDomain = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      await addDomainMutation.mutateAsync(values);
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

  const handleRefreshStatus = async (id) => {
    try {
      await refreshStatusMutation.mutateAsync(id);
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const handleRenew = (hostname) => {
    setSelectedHostname(hostname);
    setIsRenewModalVisible(true);
    renewForm.resetFields();
  };

  const handleRenewSubmit = async (values) => {
    try {
      await renewHostnameMutation.mutateAsync({
        ...values,
        hostname_id: selectedHostname.id
      });
    } catch (error) {
      // 错误已在mutation中处理
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 渲染验证信息
  const renderVerificationInfo = (record) => {
    return (
      <div className="grid grid-cols-2 gap-4 p-4">
        {/* 证书验证TXT */}
        {record.verification_txt_name && record.verification_txt_name.trim() ? (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-sm font-semibold text-blue-800">🔐 证书验证 TXT</h5>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-blue-600 flex items-center justify-between">
                <div className="flex-1">
                  <strong>名称:</strong>
                  <code className="ml-1 bg-blue-100 px-1 rounded text-xs">{record.verification_txt_name}</code>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(record.verification_txt_name, '证书验证TXT名称已复制')}
                  className="ml-2"
                />
              </div>
              <div className="text-xs text-blue-600 flex items-center justify-between">
                <div className="flex-1">
                  <strong>值:</strong>
                  <code className="ml-1 bg-blue-100 px-1 rounded text-xs break-all">{record.verification_txt_value}</code>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(record.verification_txt_value, '证书验证TXT值已复制')}
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
        {record.hostname_txt_name && record.hostname_txt_name.trim() ? (
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-sm font-semibold text-green-800">🌐 主机名验证 TXT</h5>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-green-600 flex items-center justify-between">
                <div className="flex-1">
                  <strong>名称:</strong>
                  <code className="ml-1 bg-green-100 px-1 rounded text-xs">{record.hostname_txt_name}</code>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(record.hostname_txt_name, '主机名验证TXT名称已复制')}
                  className="ml-2"
                />
              </div>
              <div className="text-xs text-green-600 flex items-center justify-between">
                <div className="flex-1">
                  <strong>值:</strong>
                  <code className="ml-1 bg-green-100 px-1 rounded text-xs break-all">{record.hostname_txt_value}</code>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(record.hostname_txt_value, '主机名验证TXT值已复制')}
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
    );
  };

  const columns = [
    {
      title: '自定义域名',
      dataIndex: 'custom_hostname',
      key: 'custom_hostname',
      width: 200,
      render: (text) => <span className={styles.domainName}>{text}</span>
    },
    {
      title: '目标IP',
      dataIndex: 'target_ip',
      key: 'target_ip',
      width: 120,
      render: (text) => <code className={styles.targetIp}>{text}</code>
    },
    {
      title: '子域名',
      dataIndex: 'subdomain',
      key: 'subdomain',
      width: 180,
      render: (text) => <code className={styles.subdomain}>{text}</code>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={getStatusColor(status)} className={styles.statusTag}>
          {status === 'active' ? '正常' :
           status === 'pending' ? '待验证' : '异常'}
        </Tag>
      )
    },
    {
      title: '验证状态',
      key: 'verification_status',
      width: 100,
      render: (_, record) => {
        const hasCertTxt = record.verification_txt_name && record.verification_txt_name.trim();
        const hasHostnameTxt = record.hostname_txt_name && record.hostname_txt_name.trim();

        return (
          <div className={styles.verificationStatus}>
            <Tag color={hasCertTxt ? "blue" : "default"} className={styles.verificationStatus}>
              🔐 证书
            </Tag>
            <Tag color={hasHostnameTxt ? "green" : "default"} className={styles.verificationStatus}>
              🌐 主机名
            </Tag>
          </div>
        );
      }
    },
    {
      title: '到期时间',
      dataIndex: 'permission_expires_at',
      key: 'permission_expires_at',
      width: 120,
      render: (text) => {
        if (!text) return <span className="text-gray-400">-</span>;

        const expiresAt = new Date(text);
        const now = new Date();
        const isExpired = expiresAt < now;
        const isExpiringSoon = !isExpired && (expiresAt - now) < 7 * 24 * 60 * 60 * 1000; // 7天内过期

        return (
          <div className={styles.expirationTime}>
            <span className={`${styles.timeText} ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : 'text-green-600'}`}>
              {formatDate(text)}
            </span>
            <ClockCircleOutlined className={`${styles.timeIcon} ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : 'text-green-500'}`} />
          </div>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text) => (
        <span className={styles.createTime}>{formatDate(text)}</span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <div className={styles.actionButtons}>
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleRefreshStatus(record.id)}
            loading={refreshStatusMutation.isLoading}
          >
            刷新状态
          </Button>
          <Button
            type="link"
            size="small"
            icon={<GiftOutlined />}
            onClick={() => handleRenew(record)}
          >
            续期
          </Button>
          <Popconfirm
            title="确定要删除这个域名吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteDomainMutation.isLoading}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      )
    }
  ];

  const domains = domainsData?.domains || [];
  const hostnames = hostnamesData?.hostnames || [];

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

      <Card title="我的域名" className="card-shadow">
        <Table
          columns={columns}
          dataSource={hostnames}
          rowKey="id"
          loading={hostnamesLoading}
          size="middle"
          scroll={{ x: 1000 }}
          className={styles.domainsTable}
          rowClassName={(record, index) =>
            index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
          }
          expandable={{
            expandedRowRender: renderVerificationInfo,
            expandIcon: ({ expanded, onExpand, record }) => (
              <Button
                type="text"
                size="small"
                icon={<DownOutlined style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />}
                onClick={e => onExpand(record, e)}
                className="text-blue-500 hover:text-blue-700"
              />
            ),
            rowExpandable: (record) => true
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            size: 'small'
          }}
        />
      </Card>

      <Modal
        title="添加自定义域名"
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
            name="custom_hostname"
            label="自定义域名"
            rules={[
              { required: true, message: '请输入域名' },
              { pattern: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/, message: '请输入有效的域名' }
            ]}
          >
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item
            name="target_ip"
            label="目标IP地址"
            rules={[
              { required: true, message: '请输入IP地址' },
              { pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, message: '请输入有效的IP地址' }
            ]}
          >
            <Input placeholder="1.2.3.4" />
          </Form.Item>

          <Form.Item
            name="domain_id"
            label="选择合租域名"
            rules={[{ required: true, message: '请选择合租域名' }]}
          >
            <Select placeholder="请选择一个可用的合租域名" loading={domainsLoading}>
              {domains.map(domain => (
                <Option key={domain.id} value={domain.id}>
                  {domain.domain}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="record_type"
            label="记录类型"
            initialValue="A"
          >
            <Select>
              <Option value="A">A记录 (IPv4)</Option>
              <Option value="AAAA">AAAA记录 (IPv6)</Option>
            </Select>
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

      {/* 续期模态框 */}
      <Modal
        title={`续期主机名: ${selectedHostname?.custom_hostname || ''}`}
        open={isRenewModalVisible}
        onCancel={() => {
          setIsRenewModalVisible(false);
          setSelectedHostname(null);
          renewForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <div className="text-sm text-blue-800">
            <p><strong>当前到期时间:</strong> {selectedHostname?.permission_expires_at ? formatDate(selectedHostname.permission_expires_at) : '未知'}</p>
            <p className="text-xs text-blue-600 mt-1">请输入续期卡密来延长此主机名的有效期</p>
          </div>
        </div>

        <Form
          form={renewForm}
          layout="vertical"
          onFinish={handleRenewSubmit}
        >
          <Form.Item
            name="card_code"
            label="续期卡密"
            rules={[
              { required: true, message: '请输入续期卡密' },
              { min: 6, message: '卡密长度至少6位' }
            ]}
          >
            <Input
              placeholder="请输入续期卡密"
              autoComplete="off"
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={renewHostnameMutation.isLoading}
                icon={<GiftOutlined />}
              >
                确认续期
              </Button>
              <Button
                onClick={() => {
                  setIsRenewModalVisible(false);
                  setSelectedHostname(null);
                  renewForm.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Domains;
