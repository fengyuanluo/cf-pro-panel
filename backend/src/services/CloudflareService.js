const axios = require('axios');

class CloudflareService {
  constructor(apiKey, email) {
    if (!apiKey || !email) {
      throw new Error('API Key和邮箱地址都是必需的');
    }

    this.apiKey = apiKey;
    this.email = email;
    this.baseURL = 'https://api.cloudflare.com/client/v4';

    // 统一使用Global API Key + Email认证方式
    this.headers = {
      'X-Auth-Email': email,
      'X-Auth-Key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  // 获取域名的Zone ID
  async getZoneId(domain) {
    try {
      const response = await axios.get(
        `${this.baseURL}/zones?name=${domain}`,
        { headers: this.headers }
      );

      if (response.data.success && response.data.result.length > 0) {
        return response.data.result[0].id;
      } else {
        throw new Error(`域名 ${domain} 不存在或无权限访问`);
      }
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        const errorMessages = errorData.errors?.map(e => e.message).join(', ') || error.response.statusText;
        throw new Error(`获取Zone ID失败: ${errorMessages} (状态码: ${error.response.status})`);
      }
      throw new Error(`获取Zone ID失败: ${error.message}`);
    }
  }

  // 创建DNS记录
  async createDNSRecord(domain, name, content, type = 'A') {
    try {
      const zoneId = await this.getZoneId(domain);

      const response = await axios.post(
        `${this.baseURL}/zones/${zoneId}/dns_records`,
        {
          type,
          name,
          content,
          ttl: 1, // 自动TTL
          proxied: true // 启用Cloudflare代理
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        return response.data.result;
      } else {
        const errorMessages = response.data.errors?.map(e => e.message).join(', ') || '未知错误';
        throw new Error(`创建DNS记录失败: ${errorMessages}`);
      }
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        const errorMessages = errorData.errors?.map(e => e.message).join(', ') || error.response.statusText;
        throw new Error(`创建DNS记录失败: ${errorMessages} (状态码: ${error.response.status})`);
      }
      throw new Error(`创建DNS记录失败: ${error.message}`);
    }
  }

  // 删除DNS记录
  async deleteDNSRecord(domain, recordId) {
    try {
      const zoneId = await this.getZoneId(domain);

      console.log('删除DNS记录请求:', {
        domain,
        recordId,
        zoneId,
        url: `${this.baseURL}/zones/${zoneId}/dns_records/${recordId}`
      });

      const response = await axios.delete(
        `${this.baseURL}/zones/${zoneId}/dns_records/${recordId}`,
        { headers: this.headers }
      );

      console.log('删除DNS记录响应:', {
        status: response.status,
        success: response.data.success,
        data: response.data
      });

      if (response.data.success) {
        console.log(`DNS记录删除成功: ${recordId}`);
        return response.data.result;
      } else {
        const errorMessages = response.data.errors?.map(e => e.message).join(', ') || '未知错误';
        throw new Error(`删除DNS记录失败: ${errorMessages}`);
      }
    } catch (error) {
      console.error('删除DNS记录错误:', error.response?.data || error.message);
      if (error.response) {
        const errorData = error.response.data;
        const errorMessages = errorData.errors?.map(e => e.message).join(', ') || error.response.statusText;
        throw new Error(`删除DNS记录失败: ${errorMessages} (状态码: ${error.response.status})`);
      }
      throw new Error(`删除DNS记录失败: ${error.message}`);
    }
  }

  // 更新DNS记录
  async updateDNSRecord(domain, recordId, content) {
    try {
      const zoneId = await this.getZoneId(domain);

      const response = await axios.patch(
        `${this.baseURL}/zones/${zoneId}/dns_records/${recordId}`,
        { content },
        { headers: this.headers }
      );

      if (response.data.success) {
        return response.data.result;
      } else {
        throw new Error(`更新DNS记录失败: ${response.data.errors.map(e => e.message).join(', ')}`);
      }
    } catch (error) {
      throw new Error(`更新DNS记录失败: ${error.message}`);
    }
  }

  // 创建自定义主机名
  async createCustomHostname(domain, hostname, originServer) {
    try {
      const zoneId = await this.getZoneId(domain);

      console.log('创建自定义主机名请求:', {
        hostname,
        originServer,
        domain,
        zoneId,
        headers: this.headers
      });

      const response = await axios.post(
        `${this.baseURL}/zones/${zoneId}/custom_hostnames`,
        {
          hostname,
          ssl: {
            method: 'txt',
            type: 'dv',
            settings: {
              min_tls_version: '1.2'
            }
          },
          custom_origin_server: originServer
        },
        { headers: this.headers }
      );

      console.log('CF API响应:', JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        return response.data.result;
      } else {
        const errorMessages = response.data.errors?.map(e => e.message).join(', ') || '未知错误';
        throw new Error(`创建自定义主机名失败: ${errorMessages}`);
      }
    } catch (error) {
      console.error('创建自定义主机名错误:', error.response?.data || error.message);
      if (error.response) {
        const errorData = error.response.data;
        const errorMessages = errorData.errors?.map(e => e.message).join(', ') || error.response.statusText;
        throw new Error(`创建自定义主机名失败: ${errorMessages} (状态码: ${error.response.status})`);
      }
      throw new Error(`创建自定义主机名失败: ${error.message}`);
    }
  }

  // 删除自定义主机名
  async deleteCustomHostname(domain, hostnameId) {
    try {
      const zoneId = await this.getZoneId(domain);

      console.log('删除自定义主机名请求:', {
        domain,
        hostnameId,
        zoneId,
        url: `${this.baseURL}/zones/${zoneId}/custom_hostnames/${hostnameId}`
      });

      const response = await axios.delete(
        `${this.baseURL}/zones/${zoneId}/custom_hostnames/${hostnameId}`,
        { headers: this.headers }
      );

      console.log('删除自定义主机名响应:', {
        status: response.status,
        success: response.data.success,
        data: response.data
      });

      if (response.data.success) {
        console.log(`自定义主机名删除成功: ${hostnameId}`);
        return response.data.result;
      } else {
        const errorMessages = response.data.errors?.map(e => e.message).join(', ') || '未知错误';
        throw new Error(`删除自定义主机名失败: ${errorMessages}`);
      }
    } catch (error) {
      console.error('删除自定义主机名错误:', error.response?.data || error.message);
      if (error.response) {
        const errorData = error.response.data;
        const errorMessages = errorData.errors?.map(e => e.message).join(', ') || error.response.statusText;
        throw new Error(`删除自定义主机名失败: ${errorMessages} (状态码: ${error.response.status})`);
      }
      throw new Error(`删除自定义主机名失败: ${error.message}`);
    }
  }

  // 获取自定义主机名状态
  async getCustomHostname(domain, hostnameId) {
    try {
      const zoneId = await this.getZoneId(domain);

      console.log('获取自定义主机名状态:', {
        hostnameId,
        domain,
        zoneId
      });

      const response = await axios.get(
        `${this.baseURL}/zones/${zoneId}/custom_hostnames/${hostnameId}`,
        { headers: this.headers }
      );

      console.log('获取主机名状态响应:', JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        return response.data.result;
      } else {
        const errorMessages = response.data.errors?.map(e => e.message).join(', ') || '未知错误';
        throw new Error(`获取自定义主机名失败: ${errorMessages}`);
      }
    } catch (error) {
      console.error('获取自定义主机名错误:', error.response?.data || error.message);
      if (error.response) {
        const errorData = error.response.data;
        const errorMessages = errorData.errors?.map(e => e.message).join(', ') || error.response.statusText;
        throw new Error(`获取自定义主机名失败: ${errorMessages} (状态码: ${error.response.status})`);
      }
      throw new Error(`获取自定义主机名失败: ${error.message}`);
    }
  }

  // 编辑自定义主机名
  async editCustomHostname(domain, hostnameId, originServer) {
    try {
      const zoneId = await this.getZoneId(domain);

      const response = await axios.patch(
        `${this.baseURL}/zones/${zoneId}/custom_hostnames/${hostnameId}`,
        {
          custom_origin_server: originServer
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        return response.data.result;
      } else {
        throw new Error(`编辑自定义主机名失败: ${response.data.errors.map(e => e.message).join(', ')}`);
      }
    } catch (error) {
      throw new Error(`编辑自定义主机名失败: ${error.message}`);
    }
  }

  // 列出自定义主机名
  async listCustomHostnames(domain, page = 1, perPage = 50) {
    try {
      const zoneId = await this.getZoneId(domain);

      const response = await axios.get(
        `${this.baseURL}/zones/${zoneId}/custom_hostnames?page=${page}&per_page=${perPage}`,
        { headers: this.headers }
      );

      if (response.data.success) {
        return response.data.result;
      } else {
        const errorMessages = response.data.errors?.map(e => e.message).join(', ') || '未知错误';
        throw new Error(`获取自定义主机名列表失败: ${errorMessages}`);
      }
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        const errorMessages = errorData.errors?.map(e => e.message).join(', ') || error.response.statusText;
        throw new Error(`获取自定义主机名列表失败: ${errorMessages} (状态码: ${error.response.status})`);
      }
      throw new Error(`获取自定义主机名列表失败: ${error.message}`);
    }
  }
}

module.exports = CloudflareService;
