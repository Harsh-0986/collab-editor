#error": {
"code": "DOCUMENT_NOT_FOUND",
"message": "Document does not exist."
}
}

Never return plain strings.

---

# Authentication

Uses Auth.js session.

Every protected endpoint requires

Authenticated User

↓

Session Validation

↓

User Extraction

↓

Permission Check

No JWT parsing inside route handlers.

Centralize authentication.

---

# Error Codes

400

BAD_REQUEST

401

UNAUTHORIZED

403

FORBIDDEN

404

NOT_FOUND

409

CONFLICT

413

PAYLOAD_TOO_LARGE

422

VALIDATION_FAILED

429

RATE_LIMITED

500

INTERNAL_SERVER_ERROR

---

# Health Check

GET

/api/health

Purpose

Connection heartbeat.

Response

{
"status":"ok",
/api/me

Response

{
"id":"",
"name":"",
"email":""
}

---

# Create Document

POST

/api/documents

Body

{
"title":"Offline Notes"
}

Validation

Title

Required

Max

100 chars

Response

{
"documentId":"..."
}

Authorization

Authenticated only.

---

# List Documents

GET

/api/documents

Returns

Owned

Editable

Viewable

Ordered by

Updated Desc

---

# Get Document

GET

/api/documents/:id

Returns

Metadata

Latest Snapshot

Permissions

Never returns pending queue.

Queue belongs only to browser.

---

# Archive Document

DELETE

/api/documents/:id

Soft delete.

Sets

archived=true

Only Owner.

---

# Invite Member

POST

/api/documents/:id/members
e valid.

Owner only.

---

# Update Role

PATCH

/api/documents/:id/members/:userId

Body

{
"role":"VIEWER"
}

Rules

Cannot remove last owner.

---

# Remove Member

DELETE

/api/documents/:id/members/:userId

Owner only.

---

# Version Timeline

GET

/api/documents/:id/versions

Returns

[
{
"version":10,
"createdAt":"",
"createdBy":"Harsh",
"reason":"AUTO"
}
]

---

# Version Detail

GET

/api/documents/:id/versions/:version

Returns

Snapshot JSON.

---

# Restore Version

POST

/api/documents/:id/versions/:version/restore

Rules

Creates

NEW snapshot.

Never overwrites.

Returns

Latest version.

---

# AI Endpoint

POST

/

SUMMARIZE

REWRITE

TITLE

GRAMMAR

EXPLAIN

CONTINUE

Validation

Max

20,000 characters.

Timeout

30 seconds.

---

# Sync Endpoint

POST

/api/sync

Most important endpoint.

Purpose

Push

-

Pull

Single request.

---

# Request

{
"documentId":"",

    "clientId":"",

    "baseVersion":42,

    "operations":[]

}

---

# Operation

{
"id":"",

    "lamport":43,

    "timestamp":"",

    "type":"INSERT",

    "payload":{},

    "checksum":""

}

---

# Validation

Maximum

100 operations.

Maximum payload

500 KB.

Reject

Nested recursive JSON.

Reject unknown operation type.

Reject malformed payload.

Reject duplicate IDs.

Reject invalid document.

Rer

Allowed

Viewer

403

Immediately reject.

---

# Sync Transaction

BEGIN

↓

Validate

↓

Permission Check

↓

Duplicate Detection

↓

Insert Operations

↓

Create Snapshot (if needed)

↓

Update Version

↓

Commit

↓

Return ACK

Any failure

↓

ROLLBACK

---

# Response

{
"acknowledged":[
"op1",
"op2"
],

    "serverVersion":44,

    "operations":[]

}

Operations

Contains remote operations unknown to client.

---

# Pull Endpoint

Optional.

GET

/api/documents/:id/operations

Query

after=42

Returns

Only missing operations.

Ordered ascending.

---

# AI Rate Limit

10 requests

per minute

per user

---

# Sync Rate Limit

30 requests

per minute

per document

---

ever increment before commit.

---

# Payload Limits

Document title

100 chars

Operation payload

10 KB

Sync batch

100 operations

Request

500 KB

AI request

20,000 chars

---

# API Guarantees

The API guarantees

✓ Authentication

✓ Authorization

✓ Validation

✓ Idempotency

✓ Atomic synchronization

✓ Consistent responses

✓ Version integrity

The API does NOT guarantee

Realtime delivery

Ordering across independent documents

Offline persistence

Those responsibilities belong to the client.Rules

↓

Database

Never validate manually.

---

# Middleware Order

Request

↓

Rate Limit

↓

Authentication

↓

Authorization

↓

Payload Size

↓

Zod

↓

Handler

↓

Response

---

# Logging

Log

Request ID

User ID

Latency

Payload Size

Document ID

Never log

Passwords

Tokens

Snapshots

AI prompts

---

# Security Headers

Content Security Policy

X-Frame-Options

X-Content-Type-Options

Referrer Policy

Strict Transport Security

Configured globally.

---

# Idempotency

Every operation ID unique.

If operation already processed

Return ACK

Do NOT insert again.

---

# Retry Semantics

Client retries

Same payload

↓

Server returns

Same ACK

No duplicate writes.

---

# Version Rules

Version only increments

After successful transaction.

N

# Validation Strategy

All requests

↓

Zod

↓

Business ject invalid client.

Reject invalid checksum.

---

# Authorization

Owner

Allowed

Editoapi/ai

Body

{
"action":"summarize",

    "document":"..."

}

Supported Actions
Body

{
"email":"",
"role":"EDITOR"
}

Validation

Email exists.

Rol "serverTime":"..."
}

Used by Sync Engine.

No authentication required.

---

# Current User

GET

API Specification

Version: 1.0

Author: Harsh Shah

---

# Overview

The backend exposes a minimal set of APIs.

The client is responsible for:

- Editing
- Offline persistence
- Queue management

The server is responsible for:

- Authentication
- Authorization
- Validation
- Persistence
- Synchronization
- Conflict resolution

The server is **NOT** responsible for editor state.

---

# API Principles

Every endpoint must:

✓ Authenticate user

✓ Authorize access

✓ Validate request

✓ Validate payload size

✓ Return typed responses

✓ Return consistent error format

✓ Never expose stack traces

---

# Response Format

Every response follows the same structure.

Success

{
"success": true,
"data": {}
}

Failure

{
"success": false,
"
