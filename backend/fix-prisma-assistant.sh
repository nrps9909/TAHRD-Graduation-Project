#!/bin/bash
# 批量修復 prisma.assistant 引用

# 備份
cp src/resolvers/memoryResolvers.ts src/resolvers/memoryResolvers.ts.backup
cp src/resolvers/knowledgeDistributionResolvers.ts src/resolvers/knowledgeDistributionResolvers.ts.backup
cp src/routes/chat.ts src/routes/chat.ts.backup
cp src/services/chiefAgentService.ts src/services/chiefAgentService.ts.backup

echo "✅ 文件已備份"

# 移除 memoryResolvers.ts 中所有 assistant field resolvers
cat > /tmp/memory_fix.txt << 'EOF'
  Memory: {
    island: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.islandId) return null
      return prisma.island.findUnique({
        where: { id: parent.islandId }
      })
    }
  }
EOF

echo "✅ 修復腳本準備完成"
