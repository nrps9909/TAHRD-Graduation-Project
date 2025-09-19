import crypto from 'crypto';

export class SecurityManager {
  // 危險指令黑名單
  private static readonly BLOCKED_COMMANDS = [
    'rm -rf /',
    'sudo',
    'chmod 777',
    'curl',
    'wget',
    'nc',
    'netcat',
    'dd if=/dev/zero',
    ':(){:|:&};:',  // Fork bomb
    'mkfs',
    'format',
  ];

  // 危險程式碼模式
  private static readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/gi,
    /new\s+Function\s*\(/gi,
    /document\.write/gi,
    /innerHTML\s*=/gi,
    /__proto__/gi,
    /constructor\[['"]constructor['"]\]/gi,
    /process\.(exit|kill)/gi,
    /require\s*\(\s*['"]child_process['"]\s*\)/gi,
    /import\s+.*child_process/gi,
  ];

  // 檔案路徑驗證
  static validateFilePath(path: string): boolean {
    // 防止路徑穿越
    if (path.includes('..') || path.includes('~')) {
      return false;
    }

    // 只允許特定檔案類型
    const allowedExtensions = [
      '.html', '.css', '.js', '.jsx', '.ts', '.tsx',
      '.json', '.md', '.txt', '.svg', '.png', '.jpg',
      '.gif', '.vue', '.scss', '.sass', '.less'
    ];

    const hasValidExtension = allowedExtensions.some(ext =>
      path.toLowerCase().endsWith(ext)
    );

    // 檢查路徑長度
    if (path.length > 255) {
      return false;
    }

    // 檢查特殊字符
    const invalidChars = /[<>:"|?*\x00-\x1f]/g;
    if (invalidChars.test(path)) {
      return false;
    }

    return hasValidExtension;
  }

  // 驗證命令安全性
  static validateCommand(command: string): {
    safe: boolean;
    reason?: string;
  } {
    // 檢查黑名單
    for (const blocked of this.BLOCKED_COMMANDS) {
      if (command.includes(blocked)) {
        return {
          safe: false,
          reason: `Command contains blocked pattern: ${blocked}`
        };
      }
    }

    // 限制命令長度
    if (command.length > 1000) {
      return {
        safe: false,
        reason: 'Command too long'
      };
    }

    // 檢查管道和重定向的複雜度
    const pipeCount = (command.match(/\|/g) || []).length;
    if (pipeCount > 3) {
      return {
        safe: false,
        reason: 'Too many pipe operations'
      };
    }

    return { safe: true };
  }

  // 驗證程式碼安全性
  static validateCode(code: string, language: string): {
    safe: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // 檢查危險模式
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        warnings.push(`Potentially dangerous pattern detected: ${pattern.source}`);
      }
    }

    // 針對不同語言的特定檢查
    switch (language) {
      case 'javascript':
      case 'typescript':
        this.validateJavaScript(code, warnings);
        break;
      case 'python':
        this.validatePython(code, warnings);
        break;
      case 'html':
        this.validateHTML(code, warnings);
        break;
    }

    // 檢查檔案大小（限制 1MB）
    const sizeInBytes = new Blob([code]).size;
    if (sizeInBytes > 1024 * 1024) {
      warnings.push('Code size exceeds 1MB limit');
    }

    return {
      safe: warnings.length === 0,
      warnings
    };
  }

  private static validateJavaScript(code: string, warnings: string[]): void {
    // 檢查無限迴圈風險
    if (/while\s*\(\s*true\s*\)/i.test(code) && !/break/i.test(code)) {
      warnings.push('Potential infinite loop detected');
    }

    // 檢查全域變數污染
    if (/window\./i.test(code) || /global\./i.test(code)) {
      warnings.push('Direct global object access detected');
    }

    // 檢查敏感 API
    const sensitiveAPIs = [
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'navigator.clipboard',
      'navigator.geolocation'
    ];

    for (const api of sensitiveAPIs) {
      if (code.includes(api)) {
        warnings.push(`Usage of sensitive API: ${api}`);
      }
    }
  }

  private static validatePython(code: string, warnings: string[]): void {
    // 檢查危險的 import
    const dangerousImports = ['os', 'subprocess', 'sys', '__import__'];
    for (const imp of dangerousImports) {
      if (new RegExp(`import\\s+${imp}|from\\s+${imp}`).test(code)) {
        warnings.push(`Dangerous import detected: ${imp}`);
      }
    }

    // 檢查 exec 和 eval
    if (/exec\s*\(|eval\s*\(/i.test(code)) {
      warnings.push('Usage of exec or eval detected');
    }
  }

  private static validateHTML(code: string, warnings: string[]): void {
    // 檢查內聯腳本
    if (/<script/i.test(code)) {
      warnings.push('Inline script tags detected');
    }

    // 檢查事件處理器
    if (/on\w+\s*=/i.test(code)) {
      warnings.push('Inline event handlers detected');
    }

    // 檢查 iframe
    if (/<iframe/i.test(code)) {
      warnings.push('iframe element detected');
    }
  }

  // 生成沙盒 token
  static generateSandboxToken(userId: string): string {
    const timestamp = Date.now();
    const data = `${userId}:${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `${Buffer.from(data).toString('base64')}.${hash}`;
  }

  // 驗證沙盒 token
  static validateSandboxToken(token: string): {
    valid: boolean;
    userId?: string;
    age?: number;
  } {
    try {
      const [data, hash] = token.split('.');
      const decoded = Buffer.from(data, 'base64').toString();
      const [userId, timestamp] = decoded.split(':');

      // 驗證 hash
      const expectedHash = crypto.createHash('sha256').update(decoded).digest('hex');
      if (hash !== expectedHash) {
        return { valid: false };
      }

      // 檢查 token 年齡（24小時有效）
      const age = Date.now() - parseInt(timestamp);
      if (age > 24 * 60 * 60 * 1000) {
        return { valid: false };
      }

      return {
        valid: true,
        userId,
        age
      };
    } catch {
      return { valid: false };
    }
  }

  // 資源限制配置
  static getResourceLimits(userTier: 'free' | 'pro' | 'team') {
    const limits = {
      free: {
        cpuShares: 512,        // 0.5 CPU
        memoryMB: 256,
        diskMB: 100,
        maxFiles: 50,
        maxFileSizeMB: 1,
        executionTimeMs: 5000,
        networkAccess: false,
        concurrentSandboxes: 1
      },
      pro: {
        cpuShares: 1024,       // 1 CPU
        memoryMB: 1024,
        diskMB: 500,
        maxFiles: 200,
        maxFileSizeMB: 5,
        executionTimeMs: 30000,
        networkAccess: true,
        concurrentSandboxes: 5
      },
      team: {
        cpuShares: 2048,       // 2 CPUs
        memoryMB: 2048,
        diskMB: 2000,
        maxFiles: 500,
        maxFileSizeMB: 10,
        executionTimeMs: 60000,
        networkAccess: true,
        concurrentSandboxes: 20
      }
    };

    return limits[userTier];
  }

  // 清理用戶輸入
  static sanitizeInput(input: string): string {
    // 移除控制字符
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // HTML 編碼
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // 限制長度
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
    }

    return sanitized;
  }
}

// 速率限制器
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // 定期清理過期記錄
    setInterval(() => this.cleanup(), windowMs);
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // 過濾掉時間窗口外的請求
    const recentRequests = userRequests.filter(
      time => now - time < this.windowMs
    );

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // 記錄新請求
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, times] of this.requests.entries()) {
      const recent = times.filter(time => now - time < this.windowMs);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }
}