import { PrismaClient } from '@prisma/client';
import { callGeminiEmbedding } from '../src/utils/geminiAPI';

const prisma = new PrismaClient();

async function regenerateMissingEmbeddings() {
  try {
    console.log('🔄 開始生成缺失的向量...\n');

    // 獲取所有記憶
    const allMemories = await prisma.memory.findMany({
      select: {
        id: true,
        userId: true,
        title: true,
        rawContent: true,
        summary: true,
        keyPoints: true,
        tags: true
      }
    });

    console.log(`📊 總記憶數: ${allMemories.length}`);

    // 檢查並生成缺失的向量
    let generated = 0;
    for (const memory of allMemories) {
      const existingEmbedding = await prisma.memoryEmbedding.findFirst({
        where: { memoryId: memory.id }
      });

      if (!existingEmbedding) {
        console.log(`🔄 為記憶生成向量: ${memory.id}`);
        console.log(`  標題: ${memory.title}`);

        // 構建用於向量化的文本
        const textForEmbedding = [
          memory.title || '',
          memory.summary || '',
          memory.rawContent?.substring(0, 500) || '',
          ...(memory.keyPoints || []),
          ...(memory.tags || [])
        ].filter(Boolean).join(' ');

        try {
          // 生成向量
          const embedding = await callGeminiEmbedding(textForEmbedding);

          // 儲存向量
          await prisma.memoryEmbedding.create({
            data: {
              memoryId: memory.id,
              userId: memory.userId,
              embedding: embedding,
              textContent: textForEmbedding.substring(0, 1000),
              embeddingModel: 'text-embedding-004'
            }
          });

          generated++;
          console.log(`  ✅ 向量生成成功`);
          console.log('');
        } catch (error: any) {
          console.error(`  ❌ 向量生成失敗:`, error.message);
          console.log('');
        }
      }
    }

    console.log(`\n📈 完成統計:`);
    console.log(`  總記憶: ${allMemories.length}`);
    console.log(`  新生成向量: ${generated}`);

    // 最終驗證
    const finalMemoryCount = await prisma.memory.count();
    const finalEmbeddingCount = await prisma.memoryEmbedding.count();

    console.log(`\n📊 最終狀態:`);
    console.log(`  記憶數: ${finalMemoryCount}`);
    console.log(`  向量數: ${finalEmbeddingCount}`);
    console.log(`  差異: ${Math.abs(finalMemoryCount - finalEmbeddingCount)}`);

    if (finalMemoryCount === finalEmbeddingCount) {
      console.log('\n🎉 完美！記憶和向量數量一致');
    } else if (finalMemoryCount > finalEmbeddingCount) {
      console.log(`\n⚠️ 仍有 ${finalMemoryCount - finalEmbeddingCount} 條記憶沒有向量`);
    } else {
      console.log(`\n⚠️ 仍有 ${finalEmbeddingCount - finalMemoryCount} 個孤兒向量`);
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateMissingEmbeddings();
