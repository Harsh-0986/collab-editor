#ict resolution

✓ Updating IndexedDB

✓ Notifying UI

The editor is responsible ONLY for editing.

---

# High Level Flow

```

User Types

↓

Editor

↓

Operation Generated

↓

Stored in IndexedDB

↓

Added to Queue

↓

UI Updated

↓

Background Sync

↓

Server

↓

ACK

↓

Queue Cleared

↓

Pull Missing Operations

↓

Merge

↓

Update Local Store

↓

Render

```

Notice:

Network never blocks typing.

---

# Core Components

```

Connection Monitor

↓

Queue Manager

↓

Batch Builder

↓

Sync Worker

↓

Conflict Resolver

↓

Merge Engine

↓

Repository

```

Each module has one responsibility.

---

# Component Responsibilities

## Connection Monitor

Detect

online

offline

heartbeat failures

server availability

Publishes

```

ONLINE

OFFLINE

SYNCING

ERROR

```

---

## Queue Manager

Responsible for

adding operations

ordering queue

retry metadata

deduplication

persistent queue

Queue survives

browser refresh

browser restart

tab close

power outage

---

## Batch Builder

Reads queue

↓

Creates sync request

Example

Instead of

```

100 requests

```

Create

```

1 request

```

Maximum batch

```

100 operations

```

Maximum payload

```

500 KB

```

---

## Sync Worker

Runs in background.

Responsibilities

Process queue

Retry failures

Apply exponential backoff

Receive acknowledgements

Pull remote operations

Trigger merge

Never interacts with UI directly.

---

## Conflict Resolver

Receives

```

Local Operations

+

Remote Operations

```

Produces

```

Merged Operation List

```

Never mutates originals.

Pure function.

---

## Merge Engine

Receives merged operations.

Applies operations.

Updates

IndexedDB

↓

React

↓

Editor

---

# Operation Model

Every edit becomes

```

Operation

```

Example

```

Insert "Hello"

Delete 5 chars

Replace line

Toggle Bold

Insert Heading

```

Never send

Entire document.

---

# Operation Schema

```

Operation

id

documentId

clientId

authorId

lamport

timestamp

type

payload

checksum

status

retryCount

```

Status

```

PENDING

SYNCING

SYNCED

FAILED

```

---

# Queue Lifecycle

```

Create Operation

↓

PENDING

↓

Sync Starts

↓

SYNCING

↓

ACK

↓

SYNCED

↓

Remove From Queue

```

Failure

```

SYNCING

↓

FAILED

�

```

documents

operations

queue

snapshots

metadata

settings

```

Queue example

```

{

id,

operationId,

retryCount,

nextRetry,

createdAt

}

```

---

# Sync State Machine

```

IDLE

↓

ONLINE

↓

QUEUE NOT EMPTY

↓

SYNCING

↓

WAIT ACK

↓

SUCCESS

↓

CLEAR QUEUE

↓

IDLE

```

Failure

```

SYNCING

↓

FAILED

↓

BACKOFF

↓

RETRY

```

Offline

```

ONLINE

↓

OFFLINE

↓

QUEUE

↓

ONLINE

↓

REPLAY

```

---

# Connectivity Detection

Listen to

```

window.online

window.offline

```

Also

Heartbeat

```

GET /health

```

every

30 seconds

Reason

Some WiFi networks remain connected

while internet is unavailable.

---

# Retry Strategy

Retry

1

↓

2

↓

4

↓

8

↓

16

↓

32 seconds

Maximum

5 retries

After maximum retries

Status

```

FAILED

```

User notified.

---

# Request Structure

POST

```

/api/sync

````

Payload

```json
{
  "documentId": "...",
  "clientId": "...",
  "baseVersion": 42,
  "operations": [
    {
      "id": "...",
      "lamport": 41,
      "type": "INSERT",
      "payload": {}
    }
  ]
}
````

---

# Server Pipeline

```

Authentication

↓

Authorization

↓

Payload Size

↓

Zod Validation

↓

Duplicate Check

↓

Conflict Detection

↓

Transaction

↓

Commit

↓

ACK

```

---

# ACK Response

```json
{
  "acknowledged": ["op1", "op2"],
  "serverVersion": 43,
  "newOperations": []
}
```

---

# Pull Phase

After ACK

Immediately request

```

ope

Inputs

```

Local

Remote

```

Step 1

Combine

↓

Sort

```

Lamport

↓

Timestamp

↓

Client ID

↓

Operation ID

```

Step 2

Ignore duplicates

↓

Apply sequentially

↓

Generate final state

Every client performs identical ordering.

Result

Deterministic convergence.

---

# Duplicate Detection

Every operation has

Checksum

Server stores checksum.

If checksum exists

Ignore operation.

Return ACK.

Safe retries.

---

# Why Checksums?

Suppose

```

Insert Hello

```

Network timeout.

Client retries.

Without checksum

```

HelloHello

```

With checksum

```

Hello

```

---

# Idempotency

Sending the same batch

10 times

must produce

exactly one edit.

ThisR

Manual save

OR  ct replay attacks

---

# Testing Checklist

Queue survives refresh

✓

Offline editing

✓

Reconnect

✓

Retry

✓

Duplicate sync

✓

Merge ordering

✓

Idempotency

✓

Permission denial

✓

Version increment

✓

Snapshot creation

✓

---

# Guarantees

The synchronization engine guarantees

✓ No blocking edits

✓ No lost edits

✓ Durable queue

✓ Automatic retry

✓ Eventual consistency

✓ Deterministic merge

✓ Idempotent synchronization

✓ Safe recovery

It does NOT guarantee

Instant realtime collaboration

Sub-second propagation

CRDT-level concurrent editing

Those are future enhancements.

The MVP focuses on correctness, resilience, and maintainability over algorithmic complexity.

Restore

Never snapshot every keystroke.

---

# Background Worker

Runs

Every

5 seconds

Conditions

Queue not empty

AND

Online

Pseudo

```

while(true)

if(queue.notEmpty)

sync()

sleep(5s)

```

---

# Failure Scenarios

## Server Offline

Queue continues growing.

No user interruption.

---

## Browser Refresh

Queue restored.

Sync resumes.

---

## Browser Crash

IndexedDB restored.

Queue restored.

No data loss.

---

## Duplicate Requests

Ignored using checksum.

---

## Partial Failure

Transaction rollback.

Nothing committed.

Retry entire batch.

---

## Invalid Payload

Reject

400

Leave queue intact.

Retry only after fix.

---

## Permission Changed

Editor becomes Viewer.

Server returns

403

Queue frozen.

User notified.

---

# UI Indicators

Top bar

```

🟢 Synced

🟡 Syncing

🔴 Offline

⚠ Retrying

❌ Failed

```

Pending queue

```

3 Pending Changes

```

Last sync

```

2 minutes ago

```

---

# Developer Panel

Visible in development.

Displays

Current connection

Queue size

Retry count

Current Lamport

Client ID

Server Version

Last ACK

Last Heartbeat

Sync Duration

This makes debugging extremely easy.

---

# Performance Rules

Never

Sync every keystroke.

Instead

Queue

↓

Batch

↓

Sync

Never

Render after every operation.

Batch UI updates.

---

# Security

Reject payload

>500 KB

Reject

>100 operations

Reject invalid JSON

Reject malformed operations

Reject unknown document

Reject unauthorized user

Reject duplicate operation IDs

Reje is mandatory.

---

# Snapshot Strategy

Snapshots created

Every

20 operations

Orations

where

lamport > localVersion

```

Never download entire document.

---

# Merge Algorithm�

Retry

↓

SYNCING

```

---

# IndexedDB Collections Sync Engine Design

Version 1.0

---

# Mission

The synchronization engine guarantees that:

- Editing never blocks on network
- Users never lose work
- Operations are eventually synchronized
- Synchronization is deterministic
- Duplicate requests never duplicate edits
- Failed synchronization automatically retries
- Multiple devices converge to the same state

The editor should never know whether the application is online.

The synchronization engine hides all networking complexity.

---

# Responsibilities

The Sync Engine is responsible for:

✓ Monitoring connectivity

✓ Persisting operations

✓ Maintaining a durable queue

✓ Retrying failed operations

✓ Batching requests

✓ Detecting duplicates

✓ Downloading remote operations

✓ Applying confl
```
