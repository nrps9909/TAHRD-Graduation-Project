import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcrypt'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const WORKSPACE_DIR = path.join(process.cwd(), 'workspace')

// Database setup (SQLite)
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

  // Claude Code Adventure progress table
  db.run(`CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    completed_scenes TEXT DEFAULT '[]',
    collected_cards TEXT DEFAULT '[]',
    unlocked_npcs TEXT DEFAULT '[]',
    current_level INTEGER DEFAULT 1,
    total_score INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: '請輸入有效的電子郵件地址',
    })
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: '密碼必須至少6個字符',
    })
  }

  try {
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

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
      const passwordMatch = await bcrypt.compare(password, user.password_hash)

      if (!passwordMatch) {
        return res.status(401).json({
          error: '電子郵件或密碼錯誤',
        })
      }

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

// Save user progress
app.post('/api/progress/save', async (req, res) => {
  const { userId, completedScenes, collectedCards, unlockedNpcs, currentLevel, totalScore } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  try {
    db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId], (err, existing) => {
      if (err) {
        console.error('Database error:', err)
        return res.status(500).json({ error: '儲存進度失敗' })
      }

      const scenesJson = JSON.stringify(completedScenes || [])
      const cardsJson = JSON.stringify(collectedCards || [])
      const npcsJson = JSON.stringify(unlockedNpcs || [])

      if (existing) {
        db.run(
          `UPDATE user_progress SET
            completed_scenes = ?,
            collected_cards = ?,
            unlocked_npcs = ?,
            current_level = ?,
            total_score = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?`,
          [scenesJson, cardsJson, npcsJson, currentLevel || 1, totalScore || 0, userId],
          (err) => {
            if (err) {
              console.error('Update error:', err)
              return res.status(500).json({ error: '更新進度失敗' })
            }
            res.json({ success: true, message: '進度已儲存' })
          }
        )
      } else {
        db.run(
          `INSERT INTO user_progress (user_id, completed_scenes, collected_cards, unlocked_npcs, current_level, total_score)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, scenesJson, cardsJson, npcsJson, currentLevel || 1, totalScore || 0],
          (err) => {
            if (err) {
              console.error('Insert error:', err)
              return res.status(500).json({ error: '儲存進度失敗' })
            }
            res.json({ success: true, message: '進度已儲存' })
          }
        )
      }
    })
  } catch (error) {
    console.error('Save progress error:', error)
    res.status(500).json({ error: '儲存進度失敗' })
  }
})

// Load user progress
app.get('/api/progress/load', async (req, res) => {
  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId], (err, progress) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({ error: '載入進度失敗' })
    }

    if (!progress) {
      return res.json({
        success: true,
        data: {
          completedScenes: [],
          collectedCards: [],
          unlockedNpcs: [],
          currentLevel: 1,
          totalScore: 0,
        },
      })
    }

    res.json({
      success: true,
      data: {
        completedScenes: JSON.parse(progress.completed_scenes || '[]'),
        collectedCards: JSON.parse(progress.collected_cards || '[]'),
        unlockedNpcs: JSON.parse(progress.unlocked_npcs || '[]'),
        currentLevel: progress.current_level,
        totalScore: progress.total_score,
      },
    })
  })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Claude Code Adventure API' })
})

app.listen(PORT, () => {
  console.log(`Claude Code Adventure server running on port ${PORT}`)
})
