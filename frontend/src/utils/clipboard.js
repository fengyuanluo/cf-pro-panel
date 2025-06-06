import { message } from 'antd';

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @param {string} successMessage - 成功提示信息
 * @param {string} errorMessage - 失败提示信息
 */
export const copyToClipboard = async (
  text,
  successMessage = '已复制到剪贴板',
  errorMessage = '复制失败，请手动复制'
) => {
  try {
    // 检查是否支持现代剪贴板API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      message.success(successMessage);
    } else {
      // 降级到传统方法
      fallbackCopyTextToClipboard(text, successMessage, errorMessage);
    }
  } catch (err) {
    console.error('复制失败:', err);
    // 尝试降级方法
    fallbackCopyTextToClipboard(text, successMessage, errorMessage);
  }
};

/**
 * 降级复制方法（兼容非HTTPS环境）
 */
function fallbackCopyTextToClipboard(text, successMessage, errorMessage) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // 避免滚动到底部
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      message.success(successMessage);
    } else {
      throw new Error('execCommand failed');
    }
  } catch (err) {
    console.error('降级复制方法也失败:', err);
    // 最后的降级方案：提示用户手动复制
    const fallbackMessage = `${errorMessage}\n\n内容：${text}`;
    if (window.prompt) {
      window.prompt('请手动复制以下内容：', text);
    } else {
      message.error(fallbackMessage);
    }
  }
}
