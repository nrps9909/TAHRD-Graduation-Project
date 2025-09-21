import express from 'express'
import cors from 'cors'
import { exec } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcrypt'

dotenv.config()

const app = express()
const execAsync = promisify(exec)
const PORT = process.env.PORT || 3001
const WORKSPACE_DIR = path.join(process.cwd(), 'workspace')

// Database setup
const db = new sqlite3.Database('./database.sqlite')

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
})

// Ensure workspace directory exists
await fs.mkdir(WORKSPACE_DIR, { recursive: true }).catch(() => {})

app.use(cors())
app.use(express.json())

// Serve workspace files statically
app.use('/workspace', express.static(WORKSPACE_DIR))

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { nickname, email, password } = req.body

  if (!nickname || !email || !password) {
    return res.status(400).json({
      error: '暱稱、電子郵件和密碼都是必填的',
    })
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: '請輸入有效的電子郵件地址',
    })
  }

  // Password validation
  if (password.length < 6) {
    return res.status(400).json({
      error: '密碼必須至少6個字符',
    })
  }

  try {
    // Hash password
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Insert user into database
    db.run(
      'INSERT INTO users (nickname, email, password_hash) VALUES (?, ?, ?)',
      [nickname, email, passwordHash],
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
              error: '此電子郵件已被註冊',
            })
          }
          console.error('Database error:', err)
          return res.status(500).json({
            error: '註冊失敗，請稍後再試',
          })
        }

        res.status(201).json({
          success: true,
          message: '註冊成功！',
          user: {
            id: this.lastID,
            nickname,
            email,
          },
        })
      }
    )
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      error: '註冊失敗，請稍後再試',
    })
  }
})

// User login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      error: '請輸入電子郵件和密碼',
    })
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({
        error: '登入失敗，請稍後再試',
      })
    }

    if (!user) {
      return res.status(401).json({
        error: '電子郵件或密碼錯誤',
      })
    }

    try {
      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash)

      if (!passwordMatch) {
        return res.status(401).json({
          error: '電子郵件或密碼錯誤',
        })
      }

      // Login successful
      res.json({
        success: true,
        message: '登入成功！',
        data: {
          user: {
            id: user.id,
            nickname: user.nickname,
            email: user.email,
          },
        },
      })
    } catch (error) {
      console.error('Password comparison error:', error)
      res.status(500).json({
        error: '登入失敗，請稍後再試',
      })
    }
  })
})

// Get user count endpoint
app.get('/api/users/count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({
        error: '無法獲取用戶數量',
      })
    }

    res.json({
      success: true,
      data: {
        count: row.count,
      },
    })
  })
})

app.post('/api/gemini', async (req, res) => {
  const { prompt, history } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  // 檢查是否有 API Key
  if (!process.env.GEMINI_API_KEY) {
    console.log('No Gemini API key found, returning mock response')

    const mockResponse = `喵～ 我是超聰明的黑噗噗！🐱

我注意到系統還沒有配置 Gemini API Key 喵～

要讓我能夠創建檔案和幫助你編程，請：

1. 前往 https://makersuite.google.com/app/apikey 獲取免費的 API Key
2. 在專案根目錄的 .env 檔案中，設定：GEMINI_API_KEY=你的API金鑰
3. 重新啟動服務器（npm run dev）

你的問題是：「${prompt}」

一旦配置好 API Key，我就能為你創建完整的程式碼檔案了喵～ 💻✨`

    return res.json({
      response: mockResponse,
      files: [],
      cleanResponse: mockResponse,
    })
  }

  try {
    // 建立簡潔的對話上下文
    let conversationContext = ''
    if (history && history.length > 0) {
      conversationContext =
        history
          .slice(-4) // 只保留最近4條對話
          .map(
            msg =>
              `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
          )
          .join('\n') + '\n'
    }

    // 簡化的系統提示 - 讓 gemini CLI 自己使用工具
    const systemPrompt = `你是超聰明的黑噗噗（喵～），一個可愛的程式設計助手。

當用戶要求創建檔案或網站時，你必須：
1. 用可愛的語氣簡短回應（1-2句話）
2. 使用 write_file 工具創建所需的檔案
3. 創建完整可運行的程式碼，不要有TODO或佔位符
4. 檔案應該是HTML/CSS/JavaScript格式，能直接在瀏覽器運行
5. 結束時說：「所有檔案都創建完成了喵～！你可以在工作區檔案頁面查看！」

對於其他對話，用可愛的方式回應即可。

請根據用戶需求創建檔案。`

    // 組合完整的提示
    const fullPrompt = conversationContext + `User: ${prompt}`

    // 設定工作目錄為 workspace 子目錄
    const workspaceDir = path.join(process.cwd(), 'workspace')

    // 執行 gemini CLI (加上 --yolo 自動確認工具調用)
    const command = `gemini --yolo "${fullPrompt}"`

    console.log('Executing Gemini CLI...')
    console.log('Working directory:', workspaceDir)

    const result = await execAsync(command, {
      cwd: workspaceDir,
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      },
      timeout: 600000, // 10分鐘超時 (600秒)
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    })

    const response = result.stdout.trim()
    console.log('Gemini response received, length:', response.length)

    // 檢查工作區中新創建的檔案
    const files = []
    try {
      const workspaceFiles = await fs.readdir(workspaceDir, { recursive: true })
      for (const file of workspaceFiles) {
        if (typeof file === 'string' && !file.startsWith('.')) {
          files.push({
            filename: file,
            created: true,
          })
        }
      }
    } catch (error) {
      console.log('Could not read workspace directory:', error.message)
    }

    return res.json({
      response: response,
      files: files,
      cleanResponse: response,
    })
  } catch (error) {
    console.error('Gemini CLI error:', error)

    const errorResponse = `喵嗚～ 抱歉，我遇到了問題 😿

錯誤：${error.message}

請檢查：
1. GEMINI_API_KEY 是否正確設定
2. 網路連接是否正常
3. 嘗試重新啟動服務器

需要幫助請查看文檔喵～ 📚`

    return res.json({
      response: errorResponse,
      files: [],
      cleanResponse: errorResponse,
    })
  }
})

// File creation endpoint
app.post('/api/file/create', async (req, res) => {
  const { filename, content } = req.body

  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' })
  }

  try {
    const filePath = path.join(WORKSPACE_DIR, filename)
    const fileDir = path.dirname(filePath)

    // Create directory if it doesn't exist
    await fs.mkdir(fileDir, { recursive: true })

    // Write file
    await fs.writeFile(filePath, content, 'utf-8')

    console.log(`File created: ${filename}`)
    res.status(200).json({
      success: true,
      message: `File ${filename} created successfully`,
      path: filePath,
    })
  } catch (error) {
    console.error('Error creating file:', error)
    res.status(500).json({
      error: 'Failed to create file',
      details: error.message,
    })
  }
})

// File reading endpoint
app.get('/api/file/read/:filename', async (req, res) => {
  const { filename } = req.params

  try {
    const decodedFilename = decodeURIComponent(filename)
    const filePath = path.join(WORKSPACE_DIR, decodedFilename)
    const content = await fs.readFile(filePath, 'utf-8')

    res.status(200).json({
      success: true,
      content,
      filename: decodedFilename,
    })
  } catch (error) {
    console.error('Error reading file:', error)
    res.status(404).json({
      error: 'File not found',
      details: error.message,
    })
  }
})

// File update endpoint
app.post('/api/file/update', async (req, res) => {
  const { filename, content } = req.body

  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' })
  }

  try {
    const filePath = path.join(WORKSPACE_DIR, filename)
    const fileDir = path.dirname(filePath)

    // Create directory if it doesn't exist
    await fs.mkdir(fileDir, { recursive: true })

    // Write file
    await fs.writeFile(filePath, content, 'utf-8')

    console.log(`File updated: ${filename}`)
    res.status(200).json({
      success: true,
      message: `File ${filename} updated successfully`,
      path: filePath,
    })
  } catch (error) {
    console.error('Error updating file:', error)
    res.status(500).json({
      error: 'Failed to update file',
      details: error.message,
    })
  }
})

// File delete endpoint
app.delete('/api/file/delete', async (req, res) => {
  const { filename } = req.body

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' })
  }

  try {
    const filePath = path.join(WORKSPACE_DIR, filename)
    await fs.unlink(filePath)

    console.log(`File deleted: ${filename}`)
    res.status(200).json({
      success: true,
      message: `File ${filename} deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting file:', error)
    res.status(404).json({
      error: 'Failed to delete file',
      details: error.message,
    })
  }
})

// Folder delete endpoint
app.delete('/api/folder/delete', async (req, res) => {
  const { folderPath } = req.body

  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' })
  }

  try {
    const fullPath = path.join(WORKSPACE_DIR, folderPath)

    // Check if folder exists
    const stats = await fs.stat(fullPath)
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' })
    }

    // Recursively delete folder and all its contents
    await fs.rm(fullPath, { recursive: true, force: true })

    console.log(`Folder deleted: ${folderPath}`)
    res.status(200).json({
      success: true,
      message: `Folder ${folderPath} deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting folder:', error)
    res.status(404).json({
      error: 'Failed to delete folder',
      details: error.message,
    })
  }
})

// List files endpoint with recursive directory support
app.get('/api/files', async (req, res) => {
  try {
    const allFiles = await getFilesRecursively(WORKSPACE_DIR, '')
    // Filter out files that contain home paths or nested workspace paths
    const filteredFiles = allFiles.filter(file => {
      // Remove any files that contain home paths
      if (file.includes('home/') || file.includes('/home/')) return false
      // Remove any files in nested workspace directories
      if (file.startsWith('workspace/')) return false
      // Remove the directories themselves
      if (file === 'home' || file === 'workspace') return false
      return true
    })
    res.status(200).json({
      success: true,
      files: filteredFiles,
    })
  } catch (error) {
    console.error('Error listing files:', error)
    res.status(500).json({
      error: 'Failed to list files',
      details: error.message,
    })
  }
})

// Helper function to recursively get all files
async function getFilesRecursively(dir, relativePath) {
  const files = []
  const items = await fs.readdir(dir, { withFileTypes: true })

  for (const item of items) {
    // Skip directories that look like home paths or nested workspace dirs
    if (
      item.isDirectory() &&
      (item.name === 'home' || item.name === 'workspace')
    ) {
      continue
    }

    const itemPath = relativePath ? `${relativePath}/${item.name}` : item.name

    if (item.isDirectory()) {
      // Recursively get files from subdirectory
      const subFiles = await getFilesRecursively(
        path.join(dir, item.name),
        itemPath
      )
      files.push(...subFiles)
    } else {
      files.push(itemPath)
    }
  }

  return files
}

app.listen(PORT, () => {
  console.log(`Gemini CLI server running on port ${PORT}`)
  console.log(`Workspace directory: ${WORKSPACE_DIR}`)
})
