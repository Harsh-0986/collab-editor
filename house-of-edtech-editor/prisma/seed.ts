import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const password = await hash('demo123', 12)
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@houseofedtech.app' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@houseofedtech.app',
      password,
      role: 'OWNER',
      emailVerified: new Date(),
    },
  })

  const collabUser = await prisma.user.upsert({
    where: { email: 'collab@houseofedtech.app' },
    update: {},
    create: {
      name: 'Collaborator',
      email: 'collab@houseofedtech.app',
      password,
      role: 'EDITOR',
      emailVerified: new Date(),
    },
  })

  const WELCOME_TITLE = 'Welcome to House of Edtech Editor'
  const PROJECT_TITLE = 'Project Requirements'

  const existingWelcome = await prisma.document.findFirst({ where: { title: WELCOME_TITLE, ownerId: demoUser.id } })
  const existingProject = await prisma.document.findFirst({ where: { title: PROJECT_TITLE, ownerId: demoUser.id } })

  const welcomeDoc = existingWelcome ?? await prisma.document.create({
    data: {
      title: WELCOME_TITLE,
      content: `
        <h1>Welcome to House of Edtech Editor!</h1>
        <p>This is a collaborative document editor built with Next.js, Prisma, and TipTap.</p>
        
        <h2>Features:</h2>
        <ul>
          <li>Real-time collaboration with WebSocket</li>
          <li>Offline support with local-first sync</li>
          <li>Version history and time travel</li>
          <li>AI-powered document enhancement</li>
          <li>Role-based access control</li>
        </ul>
        
        <h2>Getting Started:</h2>
        <p>Start typing in this document to see real-time collaboration in action. You can also:</p>
        <ol>
          <li>Invite collaborators using the "Users" button</li>
          <li>View version history with the "History" button</li>
          <li>Use the formatting toolbar to style your text</li>
        </ol>
        
        <p>Happy editing!</p>
      `,
      version: 1,
      ownerId: demoUser.id,
    },
  })

  const projectDoc = existingProject ?? await prisma.document.create({
    data: {
      title: PROJECT_TITLE,
      content: `
        <h1>Project Requirements</h1>
        <p>Document outlining the key requirements for our collaborative editor project.</p>
        
        <h2>Technical Requirements:</h2>
        <ul>
          <li>Build with Next.js 16 and React.js</li>
          <li>Use PostgreSQL with Prisma ORM</li>
          <li>Implement real-time collaboration with WebSocket</li>
          <li>Support offline functionality</li>
          <li>Add version control system</li>
        </ul>
        
        <h2>User Experience:</h2>
        <ul>
          <li>Intuitive rich text editing</li>
          <li>Real-time presence indicators</li>
          <li>Conflict resolution mechanisms</li>
          <li>AI-powered features</li>
        </ul>
      `,
      version: 1,
      ownerId: demoUser.id,
    },
  })

  for (const doc of [welcomeDoc, projectDoc]) {
    await prisma.documentMember.upsert({
      where: { documentId_userId: { documentId: doc.id, userId: demoUser.id } },
      update: {},
      create: { documentId: doc.id, userId: demoUser.id, role: 'OWNER' },
    })
  }

  for (const doc of [welcomeDoc, projectDoc]) {
    const existing = await prisma.documentSnapshot.findUnique({
      where: { documentId_version: { documentId: doc.id, version: 1 } },
    })
    if (!existing) {
      await prisma.documentSnapshot.create({
        data: {
          documentId: doc.id,
          version: 1,
          content: doc.content,
          createdBy: demoUser.id,
        },
      })
    }
  }

  console.log('Database seeded successfully!')
  console.log('---')
  console.log('User 1: demo@houseofedtech.app / demo123 (OWNER)')
  console.log('User 2: collab@houseofedtech.app / demo123 (EDITOR)')
  console.log('---')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })