#{ DocumentMember : participates

Document ||--o{ DocumentMember : contains

Document ||--o{ Operation : generates

Document ||--o{ DocumentSnapshot : stores

User {

uuid id

string name

string email

datetime createdAt

}

Document {

uuid id

string title

uuid ownerId

int currentVersion

boolean archived

datetime createdAt

}

DocumentMember {

uuid id

uuid documentId

uuid userId

enum role

}

Operation {

uuid id

uuid documentId

uuid authorId

int lamport

string clientId

string type

json payload

string hash

datetime createdAt

}

DocumentSnapshot {

uuid id

uuid documentId

int version

json snapshot

uuid createdBy

datetime createdAt

}

```

---

# User

Represents an authenticated account.

Fields

```

id

name

email

image

createdAt

updatedAt

```

Rules

Email unique.

Never delete users.

Soft delete if required.

---

# Document

Represents a logical document.

Fields

```

id

title

ownerId

currentVersion

latestOperation

archived

createdAt

updatedAt

```

Notes

The document does NOT store editing history.

It stores metadata only.

---

# DocumentMember

RBAC table.

```

id

documentId

userId

role

createdAt

```

Roles

```

OWNER

EDITOR

VIEWER

```

Rules

One owner minimum.

Cannot remove last owner.

Viewer cannot synchronize edits.

---

# Operation

Most important table.

Every synchronized edit becomes one operation.

```

id

documentId

authorId

clientId

lamport

operationType

payload

checksum

createdAt

```

OE
```

Payload

```
{
position,
length,
text,
attributes
}
```

Never overwrite operations.

Append only.

---

# Why Operations?

Instead of

```
Document

↓

Entire document update
```

We do

```
Insert "Hello"

Delete "World"

Bold paragraph

Insert Heading
```

Smaller payload.

Better merging.

History preserved.

---

# Snapshot

Stores immutable versions.

```
id

documentId

version

snapshot

createdBy

reason

createdAt
```

Reason

```
MANUAL

AUTO

RESTORE
```

Restore creates another snapshot.

Never overwrite.

---

# Sync Session

Tracks synchronization.

```
id

userId

clientId

lastSeenOperation

lastHeartbeat

status
```

Status

```
ONLINE

OFFLINE

SYNCING

DISCONNECTED
```

ny Documents

One Document

↓

Many Members

One Document

↓

Many Operations

One Document

↓

Many Snapshots

---

# Indexes

Required indexes

```
documentId

createdAt

lamport

authorId

clientId

checksum

version
```

Composite

```
(documentId, lamport)

(documentId, createdAt)

(documentId, version)

(documentId, checksum)
```

---

# Constraints

Document title

```
NOT NULL
```

Role

```
ENUM
```

Email

```
UNIQUE
```

Snapshot version

```
UNIQUE(documentId, version)
```

Checksum

```
UNIQUE(documentId, checksum)
```

Duplicate operations automatically rejected.

---

# Why Checksum?

Suppose network retries.

Same operation sent twice.

Without checksum

```
Intes.

---

# Lamport Clock

Every operation receives

```

lamport = previous + 1

```

Ordering

```

Lamport

↓

Timestamp

↓

ClientId

↓

OperationId

```

Deterministic.

---

# JSON Columns

Use JSONB.

Operation Payload

```

{
"type":"insert",

"position":20,

"text":"Hello",

"attributes":{
"bold":true
}
}

```

Snapshot

```

{
"doc":{
"type":"doc",

"content":[]
}
}

```

---

# Why JSONB?

Rich text editors produce nested documents.

Avoid hundreds of relational tables.

---

# Transaction Rules

Every sync request

```

BEGIN

Validate

Insert operations

Update version

Commit

```

If one operation fails

```

ROLLBACK

```

Entire batch rejected.

---

# Soft Deletes

Documents
   ation Rules

Owner

```

Everything

```

Editor

```

Create operation

Create snapshot

Read history

```

Viewer

```

Read only

```

Server validates.

Frontend only hides buttons.

---

# Row Isolation

Every query scoped.

Never

```

SELECT \*

FROM documents

```

Always

```

WHERE

user belongs to document

```

Prefer Prisma middleware.

Never trust client IDs.

---

# Sync Query

Example

```

SELECT \*

FROM Operation

WHERE

documentId=?

AND

lamport > lastKnownLamport

ORDER BY

lamport ASC

```

Returns only missing operations.

---

# Snapshot Query

```

SELECT \*

FROM Snapshot

WHERE documentId=?

ORDER BY version DESC

```

---

# Restore Query

```

Insert Snapshot

↓

Cre.

---

# Database Guarantees

The database guarantees

✓ No duplicate operations

✓ Immutable history

✓ Referential integrity

✓ Deterministic ordering

✓ Safe restore

✓ Role enforcement

✓ ACID synchronization

The database does NOT guarantee

Realtime communication

Offline persistence

Client state

Those responsibilities belong elsewhere.rrent version.

---

# Expected Growth

One document

```
1000 edits/day
```

Operations

```
365,000/year
```

Snapshots

```
~200/year
```

Operations dominate storage.

Snapshots remain compact.

---

# Cleanup Strategy

Old acknowledged operations

↓

Archive

↓

Compress

↓

Eventually delete after retention period

MVP may skip cleanup.

Document in README.

---

# Future Tables

Comment

Mention

Notification

Workspace

Folder

ShareLink

AuditLog

Presence

Cursor

Reaction

Attachment

These remain intentionally excluded.

---

# Prisma Design Principles

Every model

```
createdAt

updatedAt
```

UUID primary keys.

Enums instead of strings.

Relations explicit.

Indexes explicit.

Cascade only where safe.

No nullable foreign keys unless requiredate Restore Operation

↓

Increment Version

↓

Broadcast

```

Never overwrite cu
```

archived=true

```

Never hard delete.

Allows restore.

---

# Authorizsert Hello

Insert Hello
```

Result

```
HelloHello
```

Checksum prevents duplica
Useful for diagnostics.

---

# Relationships

One User

↓

Maperation types

```
INSERT

DELETE

FORMAT

MOVE

REPLAC SyncPad Database Design

Version 1.0

---

# Philosophy

The database is **not** the source of truth while the user is editing.

The browser owns active editing.

The database stores durable state for collaboration.

The database should be append-only wherever possible.

Avoid destructive updates.

Prefer immutable records.

---

# Database Choice

PostgreSQL

Reason:

- ACID transactions
- JSONB support
- Row-level locking
- Indexing
- Constraints
- Mature ecosystem
- Prisma support
- Neon deployment

---

# Core Tables

The MVP consists of the following tables.

```

User
Document
DocumentMember
DocumentSnapshot
Operation
SyncSession

````

Everything else is optional.

---

# ER Diagram

```mermaid
erDiagram

User ||--o{ Document : owns

User ||--o
````
