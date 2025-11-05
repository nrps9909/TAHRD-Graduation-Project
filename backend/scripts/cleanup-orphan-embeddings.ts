import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanupOrphanEmbeddings() {
  try {
    console.log('🧹 開始清理孤兒向量...\n');

    // 查找所有孤兒向量（向量存在但記憶不存在）
    const allEmbeddings = await prisma.memoryEmbedding.findMany({
      select: {
        id: true,
        memoryId: true
      }
    });

    const orphanIds = [];
    for (const embedding of allEmbeddings) {
      const memory = await prisma.memory.findUnique({
        where: { id: embedding.memoryId }
      });
      if (!memory) {
        orphanIds.push(embedding.id);
      }
    }

    console.log(`📊 統計:`);
    console.log(`  總向量數: ${allEmbeddings.length}`);
    console.log(`  孤兒向量: ${orphanIds.length}`);
    console.log('');

    if (orphanIds.length > 0) {
      // 刪除孤兒向量
      const result = await prisma.memoryEmbedding.deleteMany({
        where: {
          id: { in: orphanIds }
        }
      });

      console.log(`✅ 已刪除 ${result.count} 個孤兒向量`);

      // 驗證清理結果
      const remainingEmbeddings = await prisma.memoryEmbedding.count();
      const memories = await prisma.memory.count();

      console.log('');
      console.log(`📊 清理後:`);
      console.log(`  記憶數: ${memories}`);
      console.log(`  向量數: ${remainingEmbeddings}`);
      console.log(`  差異: ${Math.abs(memories - remainingEmbeddings)}`);

      if (memories === remainingEmbeddings) {
        console.log('\n🎉 完美！記憶和向量數量一致');
      } else if (memories > remainingEmbeddings) {
        console.log(`\n⚠️ 有 ${memories - remainingEmbeddings} 條記憶沒有向量，需要生成向量`);
      }
    } else {
      console.log('✅ 沒有孤兒向量，無需清理');
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanEmbeddings();
