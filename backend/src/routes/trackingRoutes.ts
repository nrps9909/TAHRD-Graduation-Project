import { Router } from 'express'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { geminiTracker } from '../utils/geminiTracker'

const router = Router()

// 獲取今天的追蹤記錄
router.get('/api/tracking/today', (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0]
    const trackingFile = join(process.cwd(), 'logs', 'gemini-tracking', `gemini-calls-${date}.json`)
    
    if (existsSync(trackingFile)) {
      const data = JSON.parse(readFileSync(trackingFile, 'utf-8'))
      res.json({
        success: true,
        date,
        count: data.length,
        records: data
      })
    } else {
      res.json({
        success: true,
        date,
        count: 0,
        records: []
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 獲取 MCP 追蹤記錄
router.get('/api/tracking/mcp', (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0]
    const mcpFile = join(process.cwd(), 'logs', 'gemini-tracking', `mcp-gemini-calls-${date}.json`)
    
    if (existsSync(mcpFile)) {
      const data = JSON.parse(readFileSync(mcpFile, 'utf-8'))
      res.json({
        success: true,
        date,
        source: 'MCP Server',
        count: data.length,
        records: data
      })
    } else {
      res.json({
        success: true,
        date,
        source: 'MCP Server',
        count: 0,
        records: []
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 獲取所有追蹤檔案列表
router.get('/api/tracking/files', (req, res) => {
  try {
    const logsDir = join(process.cwd(), 'logs', 'gemini-tracking')
    
    if (!existsSync(logsDir)) {
      res.json({
        success: true,
        files: []
      })
      return
    }
    
    const files = readdirSync(logsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const fullPath = join(logsDir, f)
        const data = JSON.parse(readFileSync(fullPath, 'utf-8'))
        return {
          filename: f,
          date: f.match(/\d{4}-\d{2}-\d{2}/)?.[0] || 'unknown',
          source: f.startsWith('mcp-') ? 'MCP Server' : 'Backend',
          recordCount: data.length,
          size: `${(readFileSync(fullPath).length / 1024).toFixed(2)} KB`
        }
      })
    
    res.json({
      success: true,
      files: files.sort((a, b) => b.date.localeCompare(a.date))
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 獲取統計資訊
router.get('/api/tracking/stats', (req, res) => {
  try {
    const stats = geminiTracker.getStatistics()
    res.json({
      success: true,
      stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 獲取最近的記錄
router.get('/api/tracking/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const records = geminiTracker.getRecentRecords(limit)
    res.json({
      success: true,
      count: records.length,
      records
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 清空追蹤記錄（僅供測試）
router.delete('/api/tracking/clear', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        error: 'Cannot clear tracking in production'
      })
      return
    }
    
    geminiTracker.clearRecords()
    res.json({
      success: true,
      message: 'Tracking records cleared'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router