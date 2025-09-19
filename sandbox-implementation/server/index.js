const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Docker = require('dockerode');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const docker = new Docker();
const sandboxes = new Map();

class ServerSandbox {
  constructor(userId) {
    this.userId = userId;
    this.container = null;
    this.files = new Map();
    this.baseDir = path.join(__dirname, 'sandboxes', userId);
  }

  async initialize() {
    // 創建用戶目錄
    await fs.mkdir(this.baseDir, { recursive: true });

    // 創建 Docker 容器（可選）
    if (process.env.USE_DOCKER === 'true') {
      await this.createDockerContainer();
    }

    console.log(`Sandbox created for user: ${this.userId}`);
  }

  async createDockerContainer() {
    try {
      this.container = await docker.createContainer({
        Image: 'node:18-alpine',
        name: `sandbox-${this.userId}`,
        WorkingDir: '/app',
        HostConfig: {
          Memory: 512 * 1024 * 1024, // 512MB
          CpuQuota: 50000, // 50% CPU
          AutoRemove: true,
          ReadonlyRootfs: false,
          NetworkMode: 'none' // 禁用網路（安全考量）
        },
        Cmd: ['sh']
      });

      await this.container.start();
    } catch (error) {
      console.error('Docker container creation failed:', error);
      // 降級到本地執行
    }
  }

  async createFile(filePath, content) {
    const fullPath = path.join(this.baseDir, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');

    this.files.set(filePath, content);
    return { success: true, path: filePath };
  }

  async updateFile(filePath, content) {
    const fullPath = path.join(this.baseDir, filePath);
    await fs.writeFile(fullPath, content, 'utf-8');

    this.files.set(filePath, content);
    return { success: true, path: filePath };
  }

  async deleteFile(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    await fs.unlink(fullPath);

    this.files.delete(filePath);
    return { success: true, path: filePath };
  }

  async executeCommand(command) {
    // 安全檢查
    const blockedCommands = ['rm -rf', 'sudo', 'chmod', 'chown'];
    if (blockedCommands.some(cmd => command.includes(cmd))) {
      return {
        error: 'Command not allowed for security reasons',
        exitCode: 1
      };
    }

    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], {
        cwd: this.baseDir,
        timeout: 5000, // 5秒超時
        env: {
          ...process.env,
          NODE_ENV: 'sandbox'
        }
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code,
          output,
          error
        });
      });
    });
  }

  async destroy() {
    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }

    // 清理檔案
    await fs.rm(this.baseDir, { recursive: true, force: true });
  }
}

// Socket.io 連接處理
io.on('connection', (socket) => {
  const username = socket.handshake.query.username;
  console.log(`User connected: ${username}`);

  let sandbox = null;

  socket.on('create-sandbox', async (data) => {
    sandbox = new ServerSandbox(data.userId);
    await sandbox.initialize();
    sandboxes.set(data.userId, sandbox);

    socket.emit('sandbox-ready', {
      userId: data.userId,
      previewUrl: `/preview/${data.userId}`
    });
  });

  socket.on('create-file', async (data) => {
    if (sandbox) {
      const result = await sandbox.createFile(data.path, data.content);
      socket.emit('file-created', result);
    }
  });

  socket.on('update-file', async (data) => {
    if (sandbox) {
      const result = await sandbox.updateFile(data.path, data.content);
      socket.emit('file-updated', result);
    }
  });

  socket.on('delete-file', async (data) => {
    if (sandbox) {
      const result = await sandbox.deleteFile(data.path);
      socket.emit('file-deleted', result);
    }
  });

  socket.on('execute-command', async (data) => {
    if (sandbox) {
      const result = await sandbox.executeCommand(data.command);
      socket.emit('command-result', result);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${username}`);
    if (sandbox) {
      await sandbox.destroy();
      sandboxes.delete(username);
    }
  });
});

// 預覽路由
app.use('/preview/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const sandbox = sandboxes.get(userId);

  if (sandbox) {
    express.static(sandbox.baseDir)(req, res, next);
  } else {
    res.status(404).send('Sandbox not found');
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSandboxes: sandboxes.size
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Sandbox server running on port ${PORT}`);
});