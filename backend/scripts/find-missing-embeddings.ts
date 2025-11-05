import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findMissingEmbeddings() {
  try {
    console.log('🔍 查找缺少向量的記憶...\n');

    // 獲取所有記憶
    const allMemories = await prisma.memory.findMany({
      select: {
        id: true,
        userId: true,
        title: true,
        createdAt: true
      }
    });

    console.log(`📊 總記憶數: ${allMemories.length}`);

    // 檢查每個記憶是否有向量
    const missingEmbeddings = [];
    for (const memory of allMemories) {
      const embedding = await prisma.memoryEmbedding.findFirst({
        where: { memoryId: memory.id }
      });

      if (!embedding) {
        missingEmbeddings.push(memory);
        console.log(`⚠️ 缺少向量的記憶: ${memory.id}`);
        console.log(`  標題: ${memory.title}`);
        console.log(`  創建時間: ${memory.createdAt}`);
        console.log('');
      }
    }

    console.log(`\n📈 統計:`);
    console.log(`  總記憶: ${allMemories.length}`);
    console.log(`  缺少向量: ${missingEmbeddings.length}`);
    console.log(`  有向量: ${allMemories.length - missingEmbeddings.length}`);

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMissingEmbeddings();
