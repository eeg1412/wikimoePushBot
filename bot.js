const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs').promises
const path = require('path')
const { Worker } = require('worker_threads')
require('dotenv').config()

function formatServerTime(date = new Date()) {
  // 返回服务器本地时间字符串，格式如：2025-07-10 15:30:45
  const pad = n => n.toString().padStart(2, '0')
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds())
  )
}

class TelegramRSSBot {
  constructor() {
    // 初始化配置
    this.botToken = process.env.BOT_TOKEN
    this.rssUrls = process.env.RSS_URLS
      ? process.env.RSS_URLS.split(',').map(url => url.trim())
      : []
    this.scanInterval = parseInt(process.env.SCAN_INTERVAL) || 30
    this.groupIds = process.env.GROUP_IDS
      ? process.env.GROUP_IDS.split(',').map(id => id.trim())
      : []
    this.dataFile = process.env.DATA_FILE || 'rss_data.json'

    // 初始化组件
    this.bot = new TelegramBot(this.botToken, { polling: true })
    this.lastArticles = new Map()
    this.intervalId = null
    this.isScanning = false
    this.stats = {
      totalScans: 0,
      totalArticlesSent: 0,
      lastScanTime: null
    }

    // 绑定方法
    this.init = this.init.bind(this)
    this.loadData = this.loadData.bind(this)
    this.saveData = this.saveData.bind(this)
    this.scanRSSFeeds = this.scanRSSFeeds.bind(this)
    this.processRSSFeed = this.processRSSFeed.bind(this)
    this.sendToGroups = this.sendToGroups.bind(this)
    this.setupBotCommands = this.setupBotCommands.bind(this)
    this.startScheduler = this.startScheduler.bind(this)

    console.log('🤖 Telegram RSS Bot 初始化中...')
    this.validateConfig()
  }

  // 验证配置
  validateConfig() {
    if (!this.botToken) {
      throw new Error('❌ 缺少 BOT_TOKEN 环境变量')
    }

    if (this.rssUrls.length === 0) {
      throw new Error('❌ 缺少 RSS_URLS 环境变量')
    }

    if (this.groupIds.length === 0) {
      throw new Error('❌ 缺少 GROUP_IDS 环境变量')
    }

    console.log('✅ 配置验证通过')
    console.log(`📡 RSS源数量: ${this.rssUrls.length}`)
    console.log(`👥 群组数量: ${this.groupIds.length}`)
    console.log(`⏰ 扫描间隔: ${this.scanInterval} 分钟`)
  }

  // 初始化机器人
  async init() {
    try {
      await this.loadData()
      this.setupBotCommands()
      this.startScheduler()

      console.log('🚀 机器人启动成功！')

      // 启动时执行一次扫描
      setTimeout(() => {
        this.scanRSSFeeds()
      }, 5000)
    } catch (error) {
      console.error('❌ 机器人初始化失败:', error)
      process.exit(1)
    }
  }

  // 加载历史数据
  async loadData() {
    try {
      const dataPath = path.join(__dirname, this.dataFile)
      const data = await fs.readFile(dataPath, 'utf8')
      const parsed = JSON.parse(data)

      this.lastArticles = new Map(Object.entries(parsed.lastArticles || {}))
      this.stats = { ...this.stats, ...parsed.stats }

      // 不加载 errors 到内存中，只保留在文件里

      console.log(`📂 加载历史数据: ${this.lastArticles.size} 条记录`)
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📂 未找到历史数据文件，将创建新文件')
        this.lastArticles = new Map()
      } else {
        console.error('❌ 加载历史数据失败:', error)
      }
    }
  }

  // 保存数据
  async saveData() {
    try {
      const dataPath = path.join(__dirname, this.dataFile)

      // 读取现有数据以获取 errors
      let existingErrors = []
      try {
        const existingData = await fs.readFile(dataPath, 'utf8')
        const parsed = JSON.parse(existingData)
        existingErrors = parsed.errors || []
      } catch (error) {
        // 文件不存在或解析错误，使用空数组
      }

      const data = {
        lastArticles: Object.fromEntries(this.lastArticles),
        stats: this.stats,
        errors: existingErrors, // 保留现有的错误记录
        lastSaved: new Date().toISOString()
      }
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2))
      console.log('💾 数据已保存')
    } catch (error) {
      console.error('❌ 保存数据失败:', error)
    }
  }

  // 保存错误记录到文件
  async saveError(url, error) {
    try {
      const dataPath = path.join(__dirname, this.dataFile)

      // 读取现有数据
      let data = {}
      try {
        const existingData = await fs.readFile(dataPath, 'utf8')
        data = JSON.parse(existingData)
      } catch (readError) {
        // 文件不存在或解析错误，使用空对象
        data = {
          lastArticles: Object.fromEntries(this.lastArticles),
          stats: this.stats,
          errors: []
        }
      }

      // 添加新错误
      const newError = {
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      }

      data.errors = data.errors || []
      data.errors.push(newError)

      // 只保留最近50个错误
      if (data.errors.length > 50) {
        data.errors = data.errors.slice(-50)
      }

      // 更新其他数据
      data.lastArticles = Object.fromEntries(this.lastArticles)
      data.stats = this.stats
      data.lastSaved = new Date().toISOString()

      await fs.writeFile(dataPath, JSON.stringify(data, null, 2))
    } catch (saveError) {
      console.error('❌ 保存错误记录失败:', saveError)
    }
  }

  // 显示内存使用情况
  showMemoryUsage() {
    const memUsage = process.memoryUsage()
    const formatBytes = bytes => {
      return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    }

    console.log('📊 内存使用情况:')
    console.log(`   RSS: ${formatBytes(memUsage.rss)} (总内存)`)
    console.log(`   Heap Used: ${formatBytes(memUsage.heapUsed)} (堆内存使用)`)
    console.log(
      `   Heap Total: ${formatBytes(memUsage.heapTotal)} (堆内存总量)`
    )
    console.log(`   External: ${formatBytes(memUsage.external)} (外部内存)`)
  }

  // 扫描所有RSS源
  async scanRSSFeeds() {
    // 检查是否已经在扫描中
    if (this.isScanning) {
      console.log('⏭️ 上一次扫描仍在进行中，跳过本次扫描')
      return
    }

    this.isScanning = true
    console.log('🔍 开始扫描RSS源...')
    this.stats.totalScans++
    this.stats.lastScanTime = new Date().toISOString()

    let totalNewArticles = 0

    try {
      for (const url of this.rssUrls) {
        try {
          const newArticlesCount = await this.processRSSFeed(url)
          totalNewArticles += newArticlesCount

          // 避免请求过快
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`❌ 处理RSS源失败 ${url}:`, error.message)
          await this.saveError(url, error)
        }
      }

      await this.saveData()

      console.log(
        `✅ [${formatServerTime()}] RSS扫描完成，发现 ${totalNewArticles} 篇新文章`
      )

      // 显示内存使用情况
      this.showMemoryUsage()
    } catch (error) {
      console.error('❌ RSS扫描过程中发生错误:', error)
    } finally {
      this.isScanning = false
    }
  }

  // 处理单个RSS源
  async processRSSFeed(url) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'rss-worker.js'))
      const lastArticleId = this.lastArticles.get(url)

      // 设置超时
      const timeout = setTimeout(() => {
        worker.terminate()
        reject(new Error('RSS获取超时'))
      }, 30000) // 30秒超时

      worker.postMessage({ url, lastArticleId })

      worker.on('message', async result => {
        clearTimeout(timeout)

        if (result.success) {
          try {
            const { newArticles, latestArticleId, feed } = result

            if (newArticles.length > 0) {
              console.log(
                `📰 发现 ${newArticles.length} 篇新文章来自: ${feed.title}`
              )

              // 记录最新文章ID
              if (latestArticleId) {
                this.lastArticles.set(url, latestArticleId)
              }

              // 发送新文章到群组（按时间顺序，最新的在前面）
              for (const article of newArticles.reverse()) {
                await this.sendToGroups(article, feed.title)
                this.stats.totalArticlesSent++

                // 避免发送过快
                await new Promise(resolve => setTimeout(resolve, 1500))
              }

              worker.terminate()
              resolve(newArticles.length)
            } else {
              console.log(
                `📰 [${formatServerTime()}] 没有新文章: ${feed.title}`
              )
              worker.terminate()
              resolve(0)
            }
          } catch (error) {
            worker.terminate()
            reject(error)
          }
        } else {
          worker.terminate()
          reject(new Error(result.error))
        }
      })

      worker.on('error', error => {
        clearTimeout(timeout)
        worker.terminate()
        reject(error)
      })

      worker.on('exit', code => {
        clearTimeout(timeout)
        if (code !== 0) {
          reject(new Error(`Worker线程异常退出，代码: ${code}`))
        }
      })
    })
  }

  // 发送消息到所有群组
  async sendToGroups(article, feedTitle) {
    const title = article.title || '无标题'
    const link = article.link || ''

    let message = `${feedTitle} 有新内容啦！！\n\n`
    message += `${title}\n\n`

    // if (pubDate) {
    //   message += `${pubDate}\n`
    // }

    if (link) {
      message += `${link}`
    }

    for (const groupId of this.groupIds) {
      try {
        await this.bot.sendMessage(groupId, message, {
          disable_web_page_preview: false
        })
        console.log(`✅ 消息已发送到群组: ${groupId}`)
      } catch (error) {
        console.error(`❌ 发送消息到群组失败 ${groupId}:`, error.message)
      }
    }
  }

  // 设置机器人命令
  setupBotCommands() {
    // 错误处理
    this.bot.on('polling_error', error => {
      console.error('❌ Telegram轮询错误:', error)
    })

    console.log('🎛️ 机器人命令设置完成')
  }

  // 启动定时任务
  startScheduler() {
    const intervalMs = this.scanInterval * 60 * 1000 // 转换为毫秒

    this.intervalId = setInterval(() => {
      console.log(`⏰ 定时扫描开始 - ${formatServerTime()}`)
      this.scanRSSFeeds()
    }, intervalMs)

    console.log(`⏰ 定时任务已启动，每 ${this.scanInterval} 分钟执行一次`)
  }

  // 停止定时任务
  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('⏰ 定时任务已停止')
    }
  }

  // 优雅关闭
  async shutdown() {
    console.log('🛑 正在关闭机器人...')

    // 停止定时任务
    this.stopScheduler()

    // 等待当前扫描完成
    while (this.isScanning) {
      console.log('⏳ 等待当前扫描完成...')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 停止机器人轮询
    await this.bot.stopPolling()

    // 保存数据
    await this.saveData()

    console.log('👋 机器人已关闭')
  }
}

// 启动机器人
const bot = new TelegramRSSBot()
bot.init()

// 优雅关闭
process.on('SIGINT', async () => {
  await bot.shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await bot.shutdown()
  process.exit(0)
})

module.exports = TelegramRSSBot
