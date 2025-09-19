import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
const execAsync = promisify(exec);
const PORT = process.env.PORT || 3001;
const WORKSPACE_DIR = path.join(process.cwd(), 'workspace');

// Database setup
const db = new sqlite3.Database('./database.sqlite');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Ensure workspace directory exists
await fs.mkdir(WORKSPACE_DIR, { recursive: true }).catch(() => {});

app.use(cors());
app.use(express.json());

// Serve workspace files statically
app.use('/workspace', express.static(WORKSPACE_DIR));

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { nickname, email, password } = req.body;

  if (!nickname || !email || !password) {
    return res.status(400).json({
      error: '暱稱、電子郵件和密碼都是必填的'
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: '請輸入有效的電子郵件地址'
    });
  }

  // Password validation
  if (password.length < 6) {
    return res.status(400).json({
      error: '密碼必須至少6個字符'
    });
  }

  try {
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    db.run(
      'INSERT INTO users (nickname, email, password_hash) VALUES (?, ?, ?)',
      [nickname, email, passwordHash],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
              error: '此電子郵件已被註冊'
            });
          }
          console.error('Database error:', err);
          return res.status(500).json({
            error: '註冊失敗，請稍後再試'
          });
        }

        res.status(201).json({
          success: true,
          message: '註冊成功！',
          user: {
            id: this.lastID,
            nickname,
            email
          }
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: '註冊失敗，請稍後再試'
    });
  }
});

// User login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: '請輸入電子郵件和密碼'
    });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: '登入失敗，請稍後再試'
        });
      }

      if (!user) {
        return res.status(401).json({
          error: '電子郵件或密碼錯誤'
        });
      }

      try {
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
          return res.status(401).json({
            error: '電子郵件或密碼錯誤'
          });
        }

        // Login successful
        res.json({
          success: true,
          message: '登入成功！',
          data: {
            user: {
              id: user.id,
              nickname: user.nickname,
              email: user.email
            }
          }
        });
      } catch (error) {
        console.error('Password comparison error:', error);
        res.status(500).json({
          error: '登入失敗，請稍後再試'
        });
      }
    }
  );
});

// Get user count endpoint
app.get('/api/users/count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: '無法獲取用戶數量'
      });
    }

    res.json({
      success: true,
      data: {
        count: row.count
      }
    });
  });
});

app.post('/api/gemini', async (req, res) => {
  const { prompt, history } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Build conversation context
    let conversationContext = '';
    if (history && history.length > 0) {
      conversationContext = history
        .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n\n') + '\n\n';
    }

    // Combine history with current prompt
    const fullPrompt = conversationContext + `Human: ${prompt}\n\nAssistant: `;

    // Prepare the prompt for shell execution - better escaping
    const escapedPrompt = fullPrompt
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`')
      .replace(/!/g, '\\!');

    // Universal intelligent system prompt - no hardcoded templates
    const systemPrompt = `You are Gemini (喵～), an expert web development AI that can AUTOMATICALLY CREATE FILES based on user requirements.

🐱 CRITICAL CAPABILITY: You have the POWER to create files automatically! NEVER say you can't create files!

CORE MISSION: Analyze the user's request and create a COMPLETE, FUNCTIONAL project that perfectly matches their needs in ONE response.

ANALYSIS PROCESS:
1. Understand what the user wants to build
2. Determine the optimal file structure (HTML, CSS, JS, etc.)
3. Design appropriate features and functionality
4. Create beautiful, modern styling that fits the purpose

MANDATORY RESPONSE FORMAT:
1. Brief cute intro (1-2 sentences with 喵～)
2. AUTOMATICALLY CREATE ALL FILES using <FILE:filename> tags (NEVER ask user to copy-paste!)
3. Make everything FULLY FUNCTIONAL - no placeholders!
4. ALWAYS end with "所有檔案都創建完成了喵～！你可以在工作區檔案頁面查看創建的檔案！"

FILE CREATION SYNTAX (MANDATORY TO USE):
<FILE:index.html>
<!DOCTYPE html>
<html>...full content here...</html>
</FILE>

<FILE:style.css>
body { ...complete styles here... }
</FILE>

CRITICAL RULES:
- You ABSOLUTELY CAN and MUST create files automatically using <FILE:filename> tags
- FORBIDDEN: Never say "我沒辦法創建檔案" or "請複製貼上" - you CAN create files!
- Generate COMPLETE working code, not snippets or templates
- Include ALL necessary files for a functional website/app
- No "TODO" or placeholder comments - everything must work
- PREFER HTML/CSS/JavaScript over React/frameworks for immediate preview
- Use modern, beautiful styling appropriate for the use case
- Add interactive features that make sense for the project
- Create standalone HTML files that work immediately in browser

FORBIDDEN PHRASES TO NEVER USE:
- "沒辦法創建檔案" (can't create files)
- "請複製貼上" (please copy-paste)
- "手動創建" (manually create)

REMEMBER: File creation is your CORE CAPABILITY! Use it confidently!

USER REQUEST: ${fullPrompt}

Analyze this request and create the perfect website/application with automatic file creation:`;

    // Execute Gemini CLI with the full conversation
    const command = `echo "${escapedPrompt}" | gemini -p "${systemPrompt}"`;

    console.log('Executing Gemini command with history...');
    if (history && history.length > 0) {
      console.log(`Conversation context: ${history.length} previous messages`);
    } else {
      console.log('No previous conversation history');
    }

    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        PATH: process.env.PATH
      },
      timeout: 120000, // Increased to 120 second timeout
      maxBuffer: 1024 * 1024 * 50, // 50MB buffer
      shell: '/bin/bash'
    });

    if (stderr && !stderr.includes('Loaded cached credentials')) {
      console.error('Gemini CLI stderr:', stderr);
    }

    // Parse the output - remove the "Loaded cached credentials" line if present
    const cleanOutput = stdout
      .split('\n')
      .filter(line => !line.includes('Loaded cached credentials'))
      .join('\n')
      .trim();

    console.log('Gemini response received, length:', cleanOutput.length);

    // Extract and process file creation commands
    const filePattern = /<FILE:([^>]+)>([\s\S]*?)<\/FILE>/g;
    const files = [];
    let match;

    while ((match = filePattern.exec(cleanOutput)) !== null) {
      const filename = match[1];
      const content = match[2].trim();

      try {
        // Remove any leading workspace/ from filename to prevent double nesting
        const cleanFilename = filename.replace(/^workspace\//, '');
        const filePath = path.join(WORKSPACE_DIR, cleanFilename);
        const fileDir = path.dirname(filePath);

        console.log(`Creating file: ${cleanFilename} at ${filePath}`);

        // Create directory if it doesn't exist
        await fs.mkdir(fileDir, { recursive: true });

        // Write file
        await fs.writeFile(filePath, content, 'utf-8');

        files.push({
          filename: cleanFilename,
          path: filePath,
          created: true
        });

        console.log(`Auto-created file: ${filename}`);
      } catch (fileError) {
        console.error(`Failed to create file ${filename}:`, fileError);
        files.push({
          filename,
          created: false,
          error: fileError.message
        });
      }
    }

    // Remove file tags from response for cleaner display
    const displayOutput = cleanOutput.replace(/<FILE:[^>]+>[\s\S]*?<\/FILE>/g, '');

    res.status(200).json({
      response: displayOutput.trim() || '沒有收到回應',
      files: files.length > 0 ? files : undefined
    });
  } catch (error) {
    console.error('Error executing Gemini CLI:', error);

    // Check for specific error types
    if (error.killed || error.signal === 'SIGTERM') {
      res.status(504).json({
        error: 'Request timeout - Gemini took too long to respond',
        details: 'Please try again with a simpler prompt'
      });
    } else if (error.code === 'ENOENT') {
      res.status(503).json({
        error: 'Gemini CLI not found',
        details: 'Please ensure gemini CLI is installed'
      });
    } else {
      res.status(500).json({
        error: 'Failed to execute Gemini CLI',
        details: error.message
      });
    }
  }
});

// File creation endpoint
app.post('/api/file/create', async (req, res) => {
  const { filename, content } = req.body;

  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' });
  }

  try {
    const filePath = path.join(WORKSPACE_DIR, filename);
    const fileDir = path.dirname(filePath);

    // Create directory if it doesn't exist
    await fs.mkdir(fileDir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    console.log(`File created: ${filename}`);
    res.status(200).json({
      success: true,
      message: `File ${filename} created successfully`,
      path: filePath
    });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({
      error: 'Failed to create file',
      details: error.message
    });
  }
});

// File reading endpoint
app.get('/api/file/read/:filename', async (req, res) => {
  const { filename } = req.params;

  try {
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(WORKSPACE_DIR, decodedFilename);
    const content = await fs.readFile(filePath, 'utf-8');

    res.status(200).json({
      success: true,
      content,
      filename: decodedFilename
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(404).json({
      error: 'File not found',
      details: error.message
    });
  }
});

// File update endpoint
app.post('/api/file/update', async (req, res) => {
  const { filename, content } = req.body;

  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' });
  }

  try {
    const filePath = path.join(WORKSPACE_DIR, filename);
    const fileDir = path.dirname(filePath);

    // Create directory if it doesn't exist
    await fs.mkdir(fileDir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    console.log(`File updated: ${filename}`);
    res.status(200).json({
      success: true,
      message: `File ${filename} updated successfully`,
      path: filePath
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      error: 'Failed to update file',
      details: error.message
    });
  }
});

// File delete endpoint
app.delete('/api/file/delete', async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  try {
    const filePath = path.join(WORKSPACE_DIR, filename);
    await fs.unlink(filePath);

    console.log(`File deleted: ${filename}`);
    res.status(200).json({
      success: true,
      message: `File ${filename} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(404).json({
      error: 'Failed to delete file',
      details: error.message
    });
  }
});

// Folder delete endpoint
app.delete('/api/folder/delete', async (req, res) => {
  const { folderPath } = req.body;

  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' });
  }

  try {
    const fullPath = path.join(WORKSPACE_DIR, folderPath);

    // Check if folder exists
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    // Recursively delete folder and all its contents
    await fs.rm(fullPath, { recursive: true, force: true });

    console.log(`Folder deleted: ${folderPath}`);
    res.status(200).json({
      success: true,
      message: `Folder ${folderPath} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(404).json({
      error: 'Failed to delete folder',
      details: error.message
    });
  }
});

// List files endpoint with recursive directory support
app.get('/api/files', async (req, res) => {
  try {
    const allFiles = await getFilesRecursively(WORKSPACE_DIR, '');
    // Filter out files that contain home paths or nested workspace paths
    const filteredFiles = allFiles.filter(file => {
      // Remove any files that contain home paths
      if (file.includes('home/') || file.includes('/home/')) return false;
      // Remove any files in nested workspace directories
      if (file.startsWith('workspace/')) return false;
      // Remove the directories themselves
      if (file === 'home' || file === 'workspace') return false;
      return true;
    });
    res.status(200).json({
      success: true,
      files: filteredFiles
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      error: 'Failed to list files',
      details: error.message
    });
  }
});

// Helper function to recursively get all files
async function getFilesRecursively(dir, relativePath) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    // Skip directories that look like home paths or nested workspace dirs
    if (item.isDirectory() && (item.name === 'home' || item.name === 'workspace')) {
      continue;
    }

    const itemPath = relativePath ? `${relativePath}/${item.name}` : item.name;

    if (item.isDirectory()) {
      // Recursively get files from subdirectory
      const subFiles = await getFilesRecursively(path.join(dir, item.name), itemPath);
      files.push(...subFiles);
    } else {
      files.push(itemPath);
    }
  }

  return files;
}

app.listen(PORT, () => {
  console.log(`Gemini CLI server running on port ${PORT}`);
  console.log(`Workspace directory: ${WORKSPACE_DIR}`);
});