# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Development Commands

### Project-wide commands (run from root)
```bash
npm run dev          # Start frontend + backend concurrently
npm run build        # Build both frontend and backend
npm run lint         # Lint both frontend and backend
npm run test         # Run tests for both

# Individual services
npm run dev:frontend  # Start frontend only
npm run dev:backend   # Start backend only
```

### Backend-specific commands (cd backend/)
```bash
npm run dev          # Start with nodemon
npm run build        # TypeScript build
npm run start        # Production start
npm run lint         # ESLint check
npm run test         # Jest tests

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed NPCs and initial data
```

### Frontend-specific commands (cd frontend/)
```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run preview      # Preview production build
npm run test         # Run Vitest tests
```

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

# Stop all services
./stop-mcp.sh
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
- **Personality File**: `backend/memories/[npc_name]/[NPC_Name]_Personality.md`
- **Chat Style**: `backend/memories/[npc_name]/[NPC_Name]_Chat_style.txt`  
- **System Prompt**: `backend/GEMINI.md` (shared system instructions)

Current NPCs:
- **Lu Peixiu (陸培修)** - The dreamy artist (npc-1)
- **Liu Yucen (劉宇岑)** - The energetic friend (npc-2)
- **Chen Tingan (陳庭安)** - The gentle soul (npc-3)

## Memory System Architecture

### Memory Hierarchy
1. **Personal Memories** - Individual NPC experiences (`backend/memories/[npc_name]/`)
2. **Shared Memories** - Town-wide knowledge base (`backend/memories/shared/`)
3. **Episodic Memories** - Specific events and interactions
4. **Semantic Memories** - General knowledge about players

### Memory Flower System
Visual representation of memories in 3D space:
- **Color**: Represents emotion (warm yellow, soft pink, etc.)
- **Size**: Indicates importance/impact
- **Position**: Shows temporal relationships
- **Glow**: Active/recent memories shine brighter

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

## Common Development Tasks

### Adding New NPCs
1. Create personality file: `backend/memories/[name]/[Name]_Personality.md`
2. Create chat style file: `backend/memories/[name]/[Name]_Chat_style.txt`
3. Update NPC mapping in `mcp_server.py`
4. Add to database seed (`backend/prisma/seed.ts`)
5. Create 3D model and position in scene

### Testing NPCs
```bash
# Test MCP integration
curl -X POST http://localhost:8765/generate \
  -H "Content-Type: application/json" \
  -d '{"npc_id": "npc-1", "message": "Hello!"}'

# Test via GraphQL
# Navigate to http://localhost:4000/graphql
```

### Performance Optimization
- Monitor MCP cache hit rates via `/status` endpoint
- Optimize Gemini CLI calls with batch processing
- Use Redis for session state caching
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

## Gemini CLI Documentation

The `gemini-cli-docs/` directory contains comprehensive documentation for optimizing Gemini CLI usage. Refer to these files when needed:
- Authentication and configuration
- Memory management and checkpointing
- Tool usage and MCP server integration
- Performance optimization techniques

## Important Notes

- The MCP architecture enables true metaverse-scale interactions
- Each NPC is designed to feel like a real friend, not a game character
- Memory persistence is critical - never delete memory files
- The gossip system creates emergent storytelling
- Performance monitoring is essential for maintaining immersion

Remember: This isn't just a game - it's a living world where every interaction matters and every NPC is a unique individual with their own story to tell.