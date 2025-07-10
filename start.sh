#!/bin/bash

echo "正在安装依赖..."
npm install

echo ""
echo "检查环境变量配置..."
if [ ! -f .env ]; then
    echo "警告: .env 文件不存在，正在复制示例配置文件..."
    cp .env.example .env
    echo "请编辑 .env 文件并配置相应的环境变量后重新运行此脚本"
    exit 1
fi

echo ""
echo "启动 Telegram RSS Bot..."
node bot.js
