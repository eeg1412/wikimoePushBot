const Parser = require('rss-parser');

async function testRSSParsing() {
    console.log('🧪 测试RSS解析功能...\n');
    
    const parser = new Parser();
    
    // 测试RSS源
    const testUrls = [
        'https://feeds.bbci.co.uk/news/rss.xml',
        'https://rss.cnn.com/rss/edition.rss',
        'https://feeds.feedburner.com/techcrunch/startups'
    ];
    
    for (const url of testUrls) {
        try {
            console.log(`📡 测试RSS源: ${url}`);
            const feed = await parser.parseURL(url);
            
            console.log(`✅ 成功解析: ${feed.title}`);
            console.log(`📰 文章数量: ${feed.items.length}`);
            
            if (feed.items.length > 0) {
                const firstItem = feed.items[0];
                console.log(`📌 最新文章: ${firstItem.title}`);
                console.log(`🔗 链接: ${firstItem.link}`);
                console.log(`📅 发布时间: ${firstItem.pubDate}`);
            }
            
            console.log(''); // 空行分隔
            
        } catch (error) {
            console.error(`❌ 解析失败 ${url}:`, error.message);
            console.log(''); // 空行分隔
        }
    }
    
    console.log('🎉 RSS解析测试完成！');
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
    testRSSParsing();
}

module.exports = { testRSSParsing };
