# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Heart Whisper Town (心語小鎮)** - An LLM-powered 3D healing social game where players interact with AI-driven NPCs to build deep emotional connections through meaningful conversations.

### Core NPCs (3 Main Characters)

1. **小雅 (Xiao Ya)** - Warm Café Owner
   - ID: `npc-1`
   - Personality: 溫暖親切的咖啡館老闆娘，總是能敏銳察覺到他人的情緒變化
   - Traits: Warm, empathetic, observant, mature
   - Location: Café (10, 0, 15)

2. **月兒 (Yue Er)** - Dreamy Musician  
   - ID: `npc-3`
   - Personality: 充滿夢幻氣質的音樂家，經常在月光下彈奏吉他
   - Traits: Romantic, artistic, free-spirited, mysterious
   - Location: Music Stage (0, 5, 25)

3. **小晴 (Xiao Qing)** - Cheerful Student
   - ID: `npc-5`
   - Personality: 活潑開朗的大學生，充滿青春活力
   - Traits: Energetic, curious, friendly, optimistic
   - Location: Town Square (-15, 0, 20)

## Quick Start

```bash
# Docker Compose (recommended)
docker-compose up -d

# Local development (requires PostgreSQL, Redis)
./start-local.sh

# Access points
Frontend: http://localhost:3000
Backend API: http://localhost:4000
GraphQL Playground: http://localhost:4000/graphql
```

## Key Commands

### Development
```bash
# Install all dependencies
npm install

# Start development servers (frontend + backend)
npm run dev

# Run specific workspace
npm run dev:frontend
npm run dev:backend

# Database operations (run from backend/)
cd backend
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:migrate    # Run migrations
npm run db:seed       # Seed initial data

# Code quality checks
npm run lint          # Lint all workspaces
npm run lint:frontend # Frontend only
npm run lint:backend  # Backend only

# Testing
npm run test          # Run all tests
npm run test:frontend # Frontend tests
npm run test:backend  # Backend tests

# Production build
npm run build         # Build all workspaces
npm start            # Start production server
```

### Automation Scripts
```bash
# Local development startup script
./start-local.sh      # Starts PostgreSQL, Redis, and dev servers locally

# Automation runner
./auto-run.sh        # Execute commands from commands.txt
./auto-run.sh -c     # Create example commands file
./auto-run.sh -s 22:00  # Schedule daily execution

# Python automation (more advanced)
python claude-auto-runner.py -e  # Create example config
python claude-auto-runner.py -r  # Run commands
```

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Three.js (React Three Fiber), Tailwind CSS, Zustand, Apollo Client, Vite
- **Backend**: Node.js, Express, GraphQL (Apollo Server), Prisma ORM, Socket.IO, Google Gemini AI
- **Database**: PostgreSQL with pgvector extension, Redis for caching
- **DevOps**: Docker, Docker Compose, Nginx

### Key Services & Files

#### AI Conversation System
- `backend/src/services/geminiService.ts` - Gemini AI integration, NPC personality management
- `backend/npc_dialogue_service.py` - Python CLI for Gemini API calls (USE_GEMINI_CLI mode)
- `backend/GEMINI.md` - NPC personality templates and emotion system documentation
- Environment: `USE_GEMINI_CLI=true` enables CLI-based integration

#### Database Schema (`backend/prisma/schema.prisma`)
Core entities: User, NPC, Conversation, Relationship, MemoryFlower, Wish, Letter, DiaryEntry, WorldState

#### Real-time Communication
- `backend/src/socket.ts` - Socket.IO configuration
- `backend/src/index.ts` - Main server entry

#### 3D Scene & UI
- `frontend/src/components/Scene.tsx` - Main 3D scene composition
- `frontend/src/components/3D/` - Three.js components (NPCs, buildings, memory flowers)
- `frontend/src/components/UI/DialogueBox.tsx` - NPC conversation interface
- `frontend/src/stores/gameStore.ts` - Zustand state management

#### GraphQL API
- `backend/src/schema.ts` - Type definitions
- `backend/src/resolvers/` - Query and mutation resolvers

## Environment Setup

```env
# Required (add to backend/.env and root .env)
GEMINI_API_KEY="your_gemini_api_key_here"  # Include quotes
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=postgresql://postgres:password123@localhost:5432/heart_whisper_town
REDIS_URL=redis://localhost:6379

# Optional
USE_GEMINI_CLI=true  # Use Python CLI for Gemini instead of direct API
NODE_ENV=development
```

## Development Workflow

### NPC Interaction System

#### Features
- **NPC-to-NPC Conversations**: NPCs automatically chat with each other every 30s-2min
- **Personality-Based Responses**: Each NPC has unique speaking patterns and interests
- **Visual Feedback**: Conversation bubbles appear when NPCs interact
- **Emotion System**: NPCs express different moods (cheerful, calm, dreamy, etc.)

#### Testing NPC Interactions
```bash
# Run the NPC interaction test
node backend/test-npc-interaction.js
```

### Game World Features
- **Grass Texture Ground**: Realistic grass material with proper texturing
- **Animal Crossing UI**: Cute, rounded interface elements
- **Visual Effects**: Bubbles, musical notes, sparkles
- **NookPhone**: In-game phone with 9 apps for various functions

### Testing AI Conversations
```bash
# Via Python CLI
python3 backend/gemini.py --chat "Hello" --npc emma
python3 backend/gemini.py --chat "Tell me about flowers" --npc lily

# Via GraphQL Playground
# Navigate to http://localhost:4000/graphql
```

### Database Management
```bash
# Initialize database (auto-runs with Docker Compose)
docker exec -i heart-whisper-postgres psql -U postgres -d heart_whisper_town < database/init.sql
docker exec -i heart-whisper-postgres psql -U postgres -d heart_whisper_town < database/memory_enhancement.sql

# Access Prisma Studio
cd backend && npx prisma studio
```

## Common Tasks

### Debugging
- GraphQL: http://localhost:4000/graphql
- Socket.IO: Set `DEBUG=socket.io:*`
- Prisma Studio: `cd backend && npx prisma studio`
- Redis CLI: `redis-cli` at port 6379
- Docker logs: `docker-compose logs -f [service]`

### Performance Optimization
- Monitor Three.js memory with browser DevTools
- Check Redis cache hits
- Review Gemini API usage and costs
- Optimize vector similarity searches in PostgreSQL

### Common Issues
1. **Gemini API failures**: Check API key format (needs quotes) and quota
2. **Database connection**: Verify PostgreSQL is running on correct port
3. **Socket.IO**: Check CORS configuration for frontend origin
4. **Build failures**: Clear node_modules and reinstall
5. **3D performance**: Dispose unused Three.js objects properly

## Project Structure
```
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # UI and 3D components
│   │   ├── stores/        # Zustand state
│   │   └── graphql/       # Queries/mutations
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── services/      # Business logic
│   │   ├── resolvers/     # GraphQL resolvers
│   │   └── prisma/        # Database client
│   └── prisma/
│       └── schema.prisma  # Database schema
├── database/               # SQL initialization
├── automation/             # Automation tools
└── docker-compose.yml      # Container orchestration
```

## Important Notes

- NPCs use Gemini AI for dynamic personality-driven responses
- Memory flowers visualize emotional connections in 3D space
- Relationship levels (1-10) affect conversation intimacy
- WebSocket enables real-time chat and presence updates
- pgvector extension powers semantic conversation search
- All timestamps are stored in UTC

## Gemini CLI Integration

**IMPORTANT**: The Gemini CLI automatically reads all `GEMINI.md` files in the current directory when launched. DO NOT manually read or pass GEMINI.md content in `gemini.py`. The Python script should only:
1. Load personality files (`*_personality.txt` and `*_chat_history.txt`)
2. Pass character data to Gemini CLI
3. Let Gemini CLI handle the prompt construction using its auto-loaded GEMINI.md

The `gemini.py` file's role is strictly to:
- Read character personality and chat history files
- Format basic character information
- Pass data to Gemini CLI for response generation
- NOT to construct complex prompts or read GEMINI.md