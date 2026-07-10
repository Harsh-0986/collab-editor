# House of Edtech Editor

A sophisticated local-first collaborative document editor built with Next.js, Prisma, and TipTap.

## Features

- 🚀 **Real-time Collaboration**: WebSocket-based real-time editing with presence indicators
- 📱 **Local-First Architecture**: Works offline with automatic sync when reconnected
- 🔄 **Version Control**: Complete history with time travel capability
- 🤖 **AI Integration**: Google Gemini-powered document enhancement
- 👥 **Role-Based Access**: Owner, Editor, and Viewer roles with fine-grained permissions
- 🔐 **Secure Authentication**: NextAuth.js with session management
- 📊 **Rich Text Editing**: TipTap-based editor with formatting tools
- 🌐 **Responsive Design**: Mobile-friendly interface

## Tech Stack

- **Frontend**: Next.js 16, React 18, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Real-time**: Socket.IO
- **Rich Text**: TipTap editor
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd house-of-edtech-editor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/house_of_edtech"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
GOOGLE_AI_API_KEY="your-google-ai-api-key"
```

4. Set up the database:
```bash
npm run db:push
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Routes

### Documents
- `GET /api/documents` - Get user's documents
- `POST /api/documents` - Create new document
- `GET /api/documents/[id]` - Get specific document
- `PUT /api/documents/[id]` - Update document
- `DELETE /api.documents/[id]` - Delete document

### Members
- `GET /api/members` - Get document members
- `POST /api/members` - Add member to document

### Operations
- `GET /api/operations` - Get document operations
- `POST /api/operations` - Create operation

### Snapshots
- `GET /api/snapshots` - Get document snapshots
- `POST /api/snapshots` - Create snapshot

### AI
- `POST /api/ai` - Process AI enhancement

## WebSocket Events

### Client → Server
- `join-document` - Join document room
- `document-update` - Send document update
- `cursor-update` - Send cursor position
- `user-presence` - Send user presence

### Server → Client
- `document-state` - Receive current state
- `document-updated` - Receive update
- `cursor-updated` - Receive cursor update
- `user-joined` - User joined
- `user-left` - User left

## Database Schema

The application uses the following main models:
- `User` - User accounts and roles
- `Document` - Document content and metadata
- `DocumentMember` - Document membership and roles
- `DocumentSnapshot` - Version history
- `Operation` - Edit operations
- `Comment` - Document comments

## Authentication

The application uses NextAuth.js with:
- Credentials provider (for demo)
- JWT session strategy
- Role-based access control

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push     # Push schema to database
npm run db:migrate  # Run migrations
npm run db:seed     # Seed database with demo data
npm run db:studio   # Open Prisma Studio
```

### Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── documents/         # Document pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── dashboard.tsx     # Dashboard page
│   ├── document-editor.tsx # Main editor
│   └── header.tsx        # Header component
├── hooks/                 # Custom React hooks
├── lib/                  # Utility libraries
└── prisma/               # Database schema and seeding
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is for demonstration purposes.