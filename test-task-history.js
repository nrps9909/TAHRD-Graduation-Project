// 測試查詢任務歷史記錄
const { MongoClient } = require('mongodb');

async function testTaskHistory() {
  const url = process.env.DATABASE_URL || 'mongodb://localhost:27017/heart-whisper-town';
  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('✅ 連接到資料庫成功');

    const db = client.db();
    const collection = db.collection('task_histories');

    // 查詢最近3條任務歷史
    const histories = await collection.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    console.log(`\n📊 找到 ${histories.length} 條任務歷史記錄:\n`);

    histories.forEach((history, index) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  記錄 #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  taskId: ${history.task_id}`);
      console.log(`  status: ${history.status}`);
      console.log(`  message: ${history.message}`);
      console.log(`  memoriesCreated: ${history.memories_created}`);
      console.log(`  categoriesInfo: ${JSON.stringify(history.categories_info, null, 2)}`);
      console.log(`  completedAt: ${history.completed_at}`);
    });

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await client.close();
    console.log('\n✅ 連接關閉');
  }
}

testTaskHistory();
