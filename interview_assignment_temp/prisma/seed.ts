import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  const user = await db.user.upsert({
    where: { email: "demo@syncpad.app" },
    update: {},
    create: {
      email: "demo@syncpad.app",
      name: "Demo User",
      image: null,
    },
  })

  const doc = await db.document.create({
    data: {
      title: "Welcome to SyncPad",
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  })

  await db.documentSnapshot.create({
    data: {
      documentId: doc.id,
      version: 1,
      snapshot: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to SyncPad" }] },
          { type: "paragraph", content: [{ type: "text", text: "This is a local-first collaborative document editor." }] },
          { type: "paragraph", content: [{ type: "text", text: "Edits are stored locally and synchronized automatically." }] },
        ],
      },
      createdBy: user.id,
      reason: "AUTO",
    },
  })

  console.log("Seed complete:", { user: user.id, document: doc.id })
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())