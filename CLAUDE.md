# CLAUDE.md

This file provides guidance to Claude (claude.ai) when working with the Heart Whisper Town metaverse codebase.

## Project Overview

**Heart Whisper Town (心語小鎮)** - A next-generation AI-powered metaverse healing game featuring autonomous NPCs that feel genuinely alive. Built with Animal Crossing aesthetics and powered by Gemini CLI with MCP (Model Context Protocol) architecture.

### Core Metaverse Concepts

- **Living NPCs**: Each NPC is a persistent AI agent with deep personalities, long-term memories, and evolving relationships
- **Gossip Network**: NPCs share information about players among themselves, creating a living social fabric
- **Persistent World**: NPCs continue their lives, form opinions, and have experiences even when players are offline
- **Emotional Intelligence**: NPCs remember not just what was said, but how it made them feel
- **Collective Memory**: The entire town shares a collective consciousness through the MCP architecture

## Architecture Overview

### MCP (Model Context Protocol) Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/Three.js)             │
│                    Animal Crossing UI/UX                 │
└────────────────────────┬────────────────────────────────┘
                         │ GraphQL/WebSocket
┌────────────────────────┴────────────────────────────────┐
│                    Backend (Node.js/Express)             │
│                    GraphQL API Server                    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────┴────────────────────────────────┐
│                    MCP Server (Python/FastAPI)           │
│                    High-Performance NPC Service          │
└────────────────────────┬────────────────────────────────┘
                         │ Subprocess
┌────────────────────────┴────────────────────────────────┐
│                    Gemini CLI                            │
│              (gemini-2.0-flash-exp model)                │
│            Auto-loads GEMINI.md contexts                 │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Three.js (React Three Fiber), Tailwind CSS, Zustand, Apollo Client
- **Backend**: Node.js, Express, GraphQL (Apollo Server), Prisma ORM, Socket.IO
- **MCP Server**: Python 3.9+, FastAPI, uvloop, asyncio, Pydantic
- **AI Engine**: Google Gemini CLI with gemini-2.0-flash-exp model
- **Database**: PostgreSQL with pgvector extension, Redis for caching
- **DevOps**: Docker, Docker Compose, Nginx

## Quick Start

```bash
# MCP-optimized startup (recommended)
./start-mcp.sh

# Traditional startup
docker-compose up -d

# Access points
Frontend: http://localhost:3000
Backend API: http://localhost:4000
GraphQL: http://localhost:4000/graphql
MCP Server: http://localhost:8765
```

## MCP Server Details

### Key Features

1. **High-Performance Architecture**
   - Uses uvloop for 2-3x faster event loops
   - LRU memory caching for instant responses
   - Parallel NPC processing capabilities
   - Sub-100ms response times for cached interactions

2. **Memory Management**
   - Per-NPC memory directories (`backend/memories/[npc_name]/`)
   - Automatic GEMINI.md loading via `--include-directories`
   - Session persistence with checkpointing
   - Shared memory pool for gossip/information exchange

3. **API Endpoints**
   ```
   POST /generate       - Generate NPC dialogue
   POST /memory/update  - Update NPC memories
   GET /status         - Service status
   GET /health         - Health check
   POST /cache/clear   - Clear response cache
   ```

### NPC Personality System

Each NPC has:
- **Personality File**: `backend/personalities/[npc_name]_personality.txt`
- **Chat History**: `backend/personalities/[npc_name]_chat_history.txt`  
- **Memory Context**: `backend/memories/[npc_name]/GEMINI.md`

Current NPCs:
- **Lu Peixiu (陸培修)** - The dreamy artist (npc-1)
- **Liu Yucen (劉宇岑)** - The energetic friend (npc-2)
- **Chen Tingan (陳庭安)** - The gentle soul (npc-3)

## Metaverse Features

### 1. Long-Term Memory System
NPCs remember everything through the MCP memory system:
```python
# Memories are stored per-NPC with emotional context
memories/lupeixiu/GEMINI.md
memories/liuyucen/GEMINI.md
memories/chentingan/GEMINI.md
memories/shared/      # Shared town memories
```

### 2. Gossip & Information Network
NPCs share information about players:
- Morning coffee discussions about recent player visits
- Sharing concerns if a player seems sad
- Celebrating player achievements together
- Forming collective opinions about events

### 3. Living World Simulation
- NPCs have daily routines and activities
- They form relationships with each other
- They have goals, dreams, and worries
- Their moods change based on town events

### 4. Emotional Intelligence
Each interaction considers:
- Current mood and emotional state
- Relationship level (1-10)
- Trust and affection metrics
- Past conversation context
- Shared memories from other NPCs

## Development Commands

### MCP Server Management
```bash
# Start MCP server standalone
cd backend && python3 mcp_server.py

# Monitor MCP performance
curl http://localhost:8765/status | jq

# Clear MCP cache
curl -X POST http://localhost:8765/cache/clear

# View MCP logs
tail -f backend/logs/mcp_server.log
```

### Database Operations
```bash
cd backend
npm run db:migrate    # Run migrations
npm run db:push       # Push schema changes
npm run db:seed       # Seed NPCs and initial data
npm run db:studio     # Open Prisma Studio
```

### Testing NPCs
```bash
# Test MCP integration
curl -X POST http://localhost:8765/generate \
  -H "Content-Type: application/json" \
  -d '{"npc_id": "npc-1", "message": "Hello!"}'

# Test via GraphQL
# Navigate to http://localhost:4000/graphql
```

## Environment Variables

```env
# Required
GEMINI_API_KEY="your-gemini-api-key"    # Must include quotes
DATABASE_URL=postgresql://postgres:password123@localhost:5432/heart_whisper_town
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here

# MCP Configuration
MCP_SERVICE_URL=http://localhost:8765
USE_GEMINI_CLI=true                     # Enable CLI mode
NODE_ENV=development
```

## Memory System Architecture

### Memory Hierarchy
1. **Personal Memories** - Individual NPC experiences
2. **Shared Memories** - Town-wide knowledge base
3. **Episodic Memories** - Specific events and interactions
4. **Semantic Memories** - General knowledge about players

### Memory Flower System
Visual representation of memories in 3D space:
- **Color**: Represents emotion (warm yellow, soft pink, etc.)
- **Size**: Indicates importance/impact
- **Position**: Shows temporal relationships
- **Glow**: Active/recent memories shine brighter

## Common Development Tasks

### Adding New NPCs
1. Create personality file: `backend/personalities/[name]_personality.txt`
2. Create memory directory: `backend/memories/[name]/GEMINI.md`
3. Update NPC mapping in `mcp_server.py`
4. Add to database seed
5. Create 3D model and position in scene

### Enhancing NPC Intelligence
1. Update GEMINI.md templates for richer responses
2. Add new emotion states and reactions
3. Implement new memory types
4. Create inter-NPC relationship dynamics

### Performance Optimization
- Monitor MCP cache hit rates
- Optimize Gemini CLI calls with batch processing
- Use Redis for session state
- Implement memory pruning for old interactions

## Troubleshooting

### MCP Server Issues
- **Timeout errors**: Increase timeout in `mcp_server.py` (default 30s)
- **404 on root**: Normal - use `/status` for health checks
- **Gemini errors**: Check API key format and quota

### Memory System
- **NPCs forgetting**: Check memory file persistence
- **Gossip not spreading**: Verify shared memory directory
- **Inconsistent responses**: Clear MCP cache

### Performance
- **Slow responses**: Check MCP server logs for bottlenecks
- **High latency**: Enable response caching
- **Memory leaks**: Monitor Python process memory usage

## Best Practices

### For Metaverse Realism
1. **Consistent Personalities**: NPCs should never break character
2. **Natural Gossip**: Information spreads organically, not instantly
3. **Emotional Continuity**: Moods persist across sessions
4. **Believable Routines**: NPCs have schedules and habits

### For Code Quality
1. **Type Safety**: Use TypeScript interfaces for all data structures
2. **Error Handling**: Graceful fallbacks for AI failures
3. **Logging**: Comprehensive logging at all service boundaries
4. **Testing**: Unit tests for personality consistency

## Future Enhancements

- **Voice Integration**: NPCs speaking with unique voices
- **Advanced Emotions**: More nuanced emotional states
- **Dream System**: NPCs dream about player interactions
- **Seasonal Events**: Town-wide celebrations and changes
- **Multi-language**: NPCs speaking player's language

## Important Notes

- The MCP architecture enables true metaverse-scale interactions
- Each NPC is designed to feel like a real friend, not a game character
- Memory persistence is critical - never delete memory files
- The gossip system creates emergent storytelling
- Performance monitoring is essential for maintaining immersion

Remember: This isn't just a game - it's a living world where every interaction matters and every NPC is a unique individual with their own story to tell.