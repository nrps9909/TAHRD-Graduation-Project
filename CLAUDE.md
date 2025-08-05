# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Heart Whisper Town (心語小鎮)** project - an LLM-powered 3D healing social game built with modern web technologies. Players interact with AI-driven NPCs in a warm virtual town, building deep emotional connections through meaningful conversations.

## Quick Start

```bash
# Start everything with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
# GraphQL Playground: http://localhost:4000/graphql
```

## Technology Stack

### Frontend
- **React 18** + **TypeScript** - Modern UI framework with type safety
- **Three.js** + **React Three Fiber** - 3D rendering and scene management
- **Tailwind CSS** - Utility-first styling with healing color palette
- **Zustand** - Lightweight state management
- **Apollo Client** - GraphQL client with caching
- **Socket.IO Client** - Real-time communication
- **Vite** - Fast build tool and dev server

### Backend
- **Node.js** + **Express** - Server runtime and framework
- **GraphQL** + **Apollo Server** - API layer with type-safe queries
- **Socket.IO** - WebSocket real-time communication
- **Prisma** - Type-safe database ORM
- **PostgreSQL** + **pgvector** - Main database with vector search
- **Redis** - Caching and session management
- **Google Gemini AI** - Large language model for NPC conversations

### Development & Deployment
- **Docker** + **Docker Compose** - Containerized development environment
- **Nginx** - Reverse proxy and static file serving
- **ESLint** + **TypeScript** - Code quality and type checking

## Key Commands

### Development
```bash
# Start all services with Docker Compose
docker-compose up -d

# Install dependencies
npm install

# Start development servers
npm run dev

# Database operations (run from backend directory)
cd backend
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema changes
npm run db:migrate    # Run migrations
npm run db:seed       # Seed initial data

# Code quality
npm run lint          # Lint all code
npm run test          # Run tests

# Individual workspace commands
npm run lint:frontend  # Lint frontend code only
npm run lint:backend   # Lint backend code only
npm run test:frontend  # Run frontend tests
npm run test:backend   # Run backend tests
```

### Production
```bash
npm run build         # Build all applications
npm start            # Start production server
```

## Architecture Overview

### Project Structure
```
heart-whisper-town/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── 3D/          # Three.js 3D components
│   │   │   └── UI/          # User interface components
│   │   ├── stores/          # Zustand state management
│   │   ├── hooks/           # Custom React hooks
│   │   ├── graphql/         # GraphQL queries and mutations
│   │   └── utils/           # Utility functions
│   └── Dockerfile
├── backend/                  # Node.js backend API
│   ├── src/
│   │   ├── resolvers/       # GraphQL resolvers
│   │   ├── services/        # Business logic services
│   │   ├── prisma/          # Prisma client and migrations
│   │   ├── schema.ts        # GraphQL schema definitions
│   │   ├── context.ts       # GraphQL context setup
│   │   ├── socket.ts        # Socket.IO configuration
│   │   └── index.ts         # Main server entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema definition
│   └── Dockerfile
├── database/                 # Database initialization scripts
│   ├── init.sql             # Initial database structure
│   └── memory_enhancement.sql # Memory system enhancements
├── docker-compose.yml        # Docker container orchestration
└── package.json             # Root workspace configuration
```

### Database Schema
The core entities and their relationships:

- **Users**: Player accounts with authentication
- **NPCs**: AI-driven characters with personalities and locations
- **Conversations**: Chat history with emotional context and vector embeddings
- **Relationships**: Dynamic user-NPC relationship tracking (trust, affection, level)
- **MemoryFlowers**: Visual representations of meaningful conversations
- **Wishes**: NPC goals that players can help fulfill
- **Letters**: Asynchronous communication system
- **DiaryEntries**: Player's personal journal
- **WorldState**: Environmental conditions (weather, time, season)

### Key Systems

1. **AI Conversation System** (`backend/src/services/geminiService.ts`)
   - Uses Google Gemini AI for dynamic, contextual responses
   - Maintains conversation history and emotional context
   - Generates relationship impacts and memory flowers
   - Handles fallback responses for API failures
   - Configurable via `USE_GEMINI_CLI` environment variable for CLI-based integration

2. **Real-time Communication** (`backend/src/socket.ts`)
   - Socket.IO for instant message delivery
   - Typing indicators and presence updates
   - Room-based communication

3. **3D Scene Management** (`frontend/src/components/3D/`)
   - Three.js scene with NPCs, buildings, and memory flowers
   - Dynamic lighting based on time of day
   - Interactive character models with mood indicators

4. **State Management** (`frontend/src/stores/gameStore.ts`)
   - Zustand store for game state
   - Real-time updates from WebSocket events
   - Persistent conversation history

## Development Guidelines

### Database Initialization
The database is automatically initialized when starting Docker Compose. Two SQL scripts are executed:
1. `database/init.sql` - Creates initial NPCs and their relationships
2. `database/memory_enhancement.sql` - Adds pgvector extension and memory-related functions

For manual initialization or testing:
```bash
# Initialize database manually
docker exec -i postgres_container psql -U postgres -d heart_whisper_town < database/init.sql
docker exec -i postgres_container psql -U postgres -d heart_whisper_town < database/memory_enhancement.sql

# Test NPC conversations via CLI
python3 gemini.py --chat "Hello" --npc emma
python3 gemini.py --chat "Tell me about flowers" --npc lily
python3 gemini.py --chat "Recommend a book" --npc tom
```

### Adding New NPCs
1. Insert NPC data in `database/init.sql` or via admin interface
2. Update NPC positioning in `frontend/src/components/3D/NPCCharacter.tsx`
3. Add personality prompts in `backend/src/services/geminiService.ts`
4. Create initial wishes in the database

### Customizing AI Behavior
- Modify prompt templates in `geminiService.ts`
- Adjust relationship impact calculations
- Configure memory flower generation logic
- Fine-tune emotional response patterns
- Refer to `GEMINI.md` for detailed NPC personality templates and emotion system

### 3D Scene Modifications
- Edit building layouts in `frontend/src/components/3D/Buildings.tsx`
- Adjust NPC appearance and animations in `NPCCharacter.tsx`
- Modify memory flower visualizations in `MemoryFlower.tsx`
- Update ground textures and environment in `Ground.tsx`

### UI Component Development
- Follow healing color palette defined in `tailwind.config.js`
- Use consistent component patterns from `frontend/src/components/UI/`
- Implement responsive design for different screen sizes
- Add accessibility features (ARIA labels, keyboard navigation)

### Key GraphQL Operations
Common queries and mutations used throughout the application:
- `getConversations` - Fetch conversation history with NPCs
- `sendMessage` - Send a message to an NPC and receive AI response
- `getRelationship` - Get current relationship status with an NPC
- `getMemoryFlowers` - Retrieve memory flowers for display
- `login` / `register` - User authentication operations

## Environment Variables

Required environment variables (copy from `.env.example`):

```env
# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here

# Authentication
JWT_SECRET=your_jwt_secret_here

# Database
DATABASE_URL=postgresql://postgres:password123@localhost:5432/heart_whisper_town

# Cache
REDIS_URL=redis://localhost:6379

# Development
NODE_ENV=development
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WS_URL=ws://localhost:4000

# Optional
USE_GEMINI_CLI=true  # Use CLI-based Gemini integration instead of API
```

## Testing Strategy

### Unit Tests
- Service layer business logic
- Utility functions and helpers
- React component behavior

### Integration Tests
- GraphQL resolver functionality
- Database operations
- AI service responses

### E2E Tests
- Complete user conversation flows
- Memory flower generation
- Relationship progression

## Performance Considerations

### Backend Optimizations
- Redis caching for frequent queries
- Connection pooling for database
- Rate limiting for AI API calls
- Efficient vector similarity searches

### Frontend Optimizations
- Three.js object pooling and disposal
- Lazy loading of 3D assets
- Optimized re-renders with Zustand
- Compressed textures and models

### AI Cost Management
- Intelligent conversation caching
- Context window optimization
- Fallback responses for API limits
- User tier-based restrictions

## Security Measures

- JWT-based authentication with expiration
- Input sanitization for user messages
- Rate limiting on API endpoints
- Secure WebSocket connections
- Environment variable management
- Docker security best practices

## Troubleshooting

### Common Issues
1. **AI API Failures**: Check Gemini API key and quota limits
2. **Database Connection**: Verify PostgreSQL container is running
3. **Socket.IO Issues**: Ensure CORS configuration allows frontend origin
4. **3D Performance**: Monitor Three.js memory usage and dispose unused objects
5. **Build Failures**: Clear node_modules and reinstall dependencies

### Development Workflow
1. Always run linting before commits
2. Test AI conversations with different personality prompts
3. Verify database migrations work in both directions
4. Check 3D scene performance on lower-end devices
5. Validate WebSocket connections across different browsers

### Debugging Tips
1. **GraphQL Playground**: Access at http://localhost:4000/graphql for testing queries
2. **Socket.IO Debugging**: Enable debug mode by setting `DEBUG=socket.io:*`
3. **Prisma Studio**: Run `npx prisma studio` in backend directory to inspect database
4. **Three.js Inspector**: Use browser DevTools for 3D scene debugging
5. **Redis CLI**: Connect to Redis at localhost:6379 to inspect cache

### Important File Locations
- **NPC Personalities**: `backend/src/services/geminiService.ts` - NPC prompt configuration
- **3D Scene Setup**: `frontend/src/components/Scene.tsx` - Main 3D scene composition
- **Game State**: `frontend/src/stores/gameStore.ts` - Central state management
- **GraphQL Schema**: `backend/src/schema.ts` - API type definitions
- **Database Models**: `backend/prisma/schema.prisma` - Data structure definitions

This codebase implements a sophisticated AI-powered social game that requires careful attention to both technical architecture and user experience design.