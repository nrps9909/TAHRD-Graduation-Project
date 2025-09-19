import { WebContainer } from '@webcontainer/api';
import { io, Socket } from 'socket.io-client';

export class SandboxManager {
  private container: WebContainer | null = null;
  private socket: Socket | null = null;
  private userId: string = '';

  async initialize(username: string) {
    this.userId = username;

    // 連接到後端
    this.socket = io('http://localhost:3001', {
      query: { username }
    });

    // 啟動 WebContainer
    try {
      this.container = await WebContainer.boot();
      console.log('Sandbox initialized for user:', username);

      await this.setupBaseEnvironment();
    } catch (error) {
      console.error('Failed to initialize sandbox:', error);
      // 降級到伺服器端沙盒
      await this.initializeServerSandbox();
    }
  }

  private async setupBaseEnvironment() {
    if (!this.container) return;

    // 創建基礎檔案結構
    const files = {
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'user-project',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build'
            },
            devDependencies: {
              vite: '^5.0.0'
            }
          }, null, 2)
        }
      },
      'index.html': {
        file: {
          contents: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <h1>歡迎使用 Claude Code Sandbox!</h1>
    <script src="/main.js"></script>
</body>
</html>`
        }
      },
      'style.css': {
        file: {
          contents: `body {
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
}

h1 {
    text-align: center;
    font-size: 2.5rem;
    margin-top: 20vh;
}`
        }
      },
      'main.js': {
        file: {
          contents: `console.log('Sandbox is ready!');

// 你的程式碼從這裡開始
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
});`
        }
      }
    };

    await this.container.mount(files);
  }

  private async initializeServerSandbox() {
    // 降級方案：使用伺服器端沙盒
    this.socket?.emit('create-sandbox', {
      userId: this.userId
    });

    this.socket?.on('sandbox-ready', (data) => {
      console.log('Server sandbox ready:', data);
    });
  }

  async createFile(path: string, content: string) {
    if (this.container) {
      await this.container.fs.writeFile(path, content);
    } else {
      this.socket?.emit('create-file', { path, content });
    }
  }

  async updateFile(path: string, content: string) {
    if (this.container) {
      await this.container.fs.writeFile(path, content);
    } else {
      this.socket?.emit('update-file', { path, content });
    }
  }

  async deleteFile(path: string) {
    if (this.container) {
      await this.container.fs.rm(path);
    } else {
      this.socket?.emit('delete-file', { path });
    }
  }

  async executeCommand(command: string) {
    if (this.container) {
      const process = await this.container.spawn('sh', ['-c', command]);

      return new Promise((resolve) => {
        let output = '';

        process.output.on('data', (data) => {
          output += data;
        });

        process.exit.then((exitCode) => {
          resolve({
            exitCode,
            output
          });
        });
      });
    } else {
      return new Promise((resolve) => {
        this.socket?.emit('execute-command', { command });
        this.socket?.once('command-result', resolve);
      });
    }
  }

  async getPreviewUrl(): Promise<string> {
    if (this.container) {
      // 獲取預覽 URL
      const process = await this.container.spawn('npm', ['run', 'dev']);
      // WebContainer 會提供一個預覽 URL
      return 'http://localhost:5173'; // 實際會是動態生成的 URL
    } else {
      return `http://localhost:3001/preview/${this.userId}`;
    }
  }

  destroy() {
    this.socket?.disconnect();
    // WebContainer 會自動清理
  }
}