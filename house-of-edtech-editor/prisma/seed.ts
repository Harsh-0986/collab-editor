import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const hashedPassword = await hash('demo123', 12)
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@houseofedtech.app' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@houseofedtech.app',
      password: hashedPassword,
      role: 'OWNER',
      emailVerified: new Date(),
    },
  })

  // Create demo documents
  const welcomeDoc = await prisma.document.create({
    data: {
      title: 'Welcome to House of Edtech Editor',
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
        
        <p>Happy editing! 🚀</p>
      `,
      version: 1,
      ownerId: demoUser.id,
    },
  })

  const projectDoc = await prisma.document.create({
    data: {
      title: 'Project Requirements',
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

  // Add demo user as member of both documents
  await prisma.documentMember.createMany({
    data: [
      {
        documentId: welcomeDoc.id,
        userId: demoUser.id,
        role: 'OWNER',
      },
      {
        documentId: projectDoc.id,
        userId: demoUser.id,
        role: 'OWNER',
      },
    ],
  })

  // Create initial snapshots
  await prisma.documentSnapshot.createMany({
    data: [
      {
        documentId: welcomeDoc.id,
        version: 1,
        content: welcomeDoc.content,
        createdBy: demoUser.id,
      },
      {
        documentId: projectDoc.id,
        version: 1,
        content: projectDoc.content,
        createdBy: demoUser.id,
      },
    ],
  })

  console.log('✅ Database seeded successfully!')
  console.log('Demo user created:', demoUser.email)
  console.log('Documents created:', welcomeDoc.title, 'and', projectDoc.title)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })