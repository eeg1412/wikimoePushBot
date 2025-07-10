# wikimoePushBot RSS Bot

一个基于 Node.js 的 Telegram 机器人，用于定时扫描 RSS 源并将新文章发送到指定群组。

## 功能特性

- 🤖 **自动化 RSS 监控**: 定时扫描多个 RSS 源
- 📰 **智能新文章检测**: 自动识别并发送新文章
- 👥 **多群组支持**: 同时向多个 Telegram 群组发送消息
- 💾 **数据持久化**: 记录已发送文章，避免重复发送
- ⏰ **灵活配置**: 可配置扫描间隔、RSS 源、群组等

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd wikimoePushBot
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并编辑配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Telegram Bot Token (从 @BotFather 获取)
BOT_TOKEN=你的机器人Token

# RSS 源地址，用逗号分隔
RSS_URLS=https://example.com/rss.xml,https://another-example.com/feed.xml

# 扫描间隔 (分钟)
SCAN_INTERVAL=30

# 群组 ID，用逗号分隔 (可以是正数或负数)
GROUP_IDS=-100123456789,-100987654321

# 数据存储文件名
DATA_FILE=rss_data.json
```

### 4. 获取 Bot Token

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 命令创建新机器人
3. 按照提示设置机器人名称和用户名
4. 复制获得的 Token 到 `.env` 文件

### 5. 获取群组 ID

1. 将机器人添加到目标群组
2. 在群组中发送任意消息
3. 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 在返回的 JSON 中找到 `chat.id` 字段，这就是群组 ID

### 6. 运行机器人

**方法 1: 使用配置向导 (推荐)**

```bash
# 运行配置向导
npm run setup

# 启动机器人
npm start
```

## 配置说明

### 环境变量

| 变量名          | 描述                   | 示例                                                    |
| --------------- | ---------------------- | ------------------------------------------------------- |
| `BOT_TOKEN`     | Telegram 机器人 Token  | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`             |
| `RSS_URLS`      | RSS 源地址，用逗号分隔 | `https://example.com/rss.xml,https://test.com/feed.xml` |
| `SCAN_INTERVAL` | 扫描间隔（分钟）       | `30`                                                    |
| `GROUP_IDS`     | 群组 ID，用逗号分隔    | `-100123456789,-100987654321`                           |
| `DATA_FILE`     | 数据存储文件名         | `rss_data.json`                                         |

### RSS 源格式

支持标准的 RSS 2.0 和 Atom 格式的 RSS 源。

### 群组 ID

- 私人聊天的 ID 是正数
- 群组的 ID 是负数
- 超级群组的 ID 以-100 开头

## 故障排除

### 常见问题

1. **机器人无法发送消息到群组**

   - 确认机器人已被添加到群组
   - 确认群组 ID 正确
   - 确认机器人有发送消息的权限

2. **RSS 源无法访问**

   - 检查 RSS 源 URL 是否正确
   - 确认网络连接正常
   - 某些 RSS 源可能需要 User-Agent 头

3. **定时任务不执行**
   - 检查 SCAN_INTERVAL 配置
   - 确认 cron 表达式正确

### 调试模式

在代码中添加更多日志输出来调试问题：

```javascript
console.log('调试信息:', debugInfo)
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。
