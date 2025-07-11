const { parentPort } = require('worker_threads')
const Parser = require('rss-parser')

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'wikimoeTelegramPushBot/1.0'
  }
})

parentPort.on('message', async data => {
  const { url, lastArticleId } = data

  try {
    console.log(`🧵 Worker正在获取: ${url}`)

    const feed = await parser.parseURL(url)
    const newArticles = []

    // 查找新文章
    for (const item of feed.items) {
      const articleId = item.guid || item.link || item.title

      if (!lastArticleId || articleId !== lastArticleId) {
        newArticles.push(item)
      } else {
        break // 找到已知文章，停止搜索
      }
    }

    // 返回结果
    parentPort.postMessage({
      success: true,
      url,
      feed: {
        title: feed.title,
        items: feed.items
      },
      newArticles,
      latestArticleId: feed.items[0]
        ? feed.items[0].guid || feed.items[0].link || feed.items[0].title
        : null
    })
  } catch (error) {
    parentPort.postMessage({
      success: false,
      url,
      error: error.message
    })
  }
})
