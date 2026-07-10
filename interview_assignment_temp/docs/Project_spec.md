#--

# Scope

## Included

Authentication

Document CRUD

Document editor

Offline editing

Synchronization queue

Conflict resolution

Version history

Restore history

Role-based access

AI assistant

Connection indicator

Sync status

Deployment

Responsive UI

Testing

Documentation

---

## Excluded

Audio

Video

Comments

Realtime cursor

Presence

Notifications

Teams

Folders

Sharing links

Enterprise billing

These can be future improvements.

---

# User Personas

## Alice

Owner

Creates documents.

Invites collaborators.

Can restore versions.

Can delete documents.

Can assign roles.

---

## Bob

Editor

Can edit.

Can synchronize.

Cits.

Cannot modify document.

---

# User Stories

## Authentication

As a new user

I want to create an account

So I can own documents.

Acceptance Criteria

✓ Login works

✓ Logout works

✓ Protected routes exist

---

## Create Document

As an authenticated user

I want to create documents

So I can begin writing.

Acceptance Criteria

✓ Appears instantly

✓ Stored locally

✓ Synced automatically

---

## Offline Editing

As a traveler

I want to edit while offline

So I never lose work.

Acceptance Criteria

✓ No API requests required

✓ Refresh retains edits

✓ Closing browser retains edits

---

## Synchronization

As an offline user

I want edits synchronized automatically

Srks

✓ No duplicate operations

✓ No lost operations

---

## Version History

As an editor

I want previous versions

So mistakes are reversible.

Acceptance Criteria

✓ Timeline visible

✓ Preview versions

✓ Restore safely

---

## AI

As a writer

I want AI assistance

So I can improve content.

Acceptance Criteria

✓ Summarize

✓ Rewrite

✓ Generate title

✓ Explain text

---

# Functional Requirements

## Authentication

Required

JWT session

Protected routes

Role validation

Secure cookies

Session persistence

---

## Document Editor

Rich text

Undo

Redo

Formatting

Autosave

Responsive

---

## Local Storage

Every edit immediately stored in IndexedDB.

Queue survives refresh.

Queue survives restart.

---

## Synchronization

When online

Replay pending queue.

Receive server acknowledgement.

Remove acknowledged operations.

Download newer operations.

Apply merge.

Refresh UI.

---

## Conflict Resolution

Never overwrite.

Always merge.

Deterministic ordering.

Timestamp

↓

Client ID

↓

Operation ID

---

## Version History

Manual snapshots.

Auto snapshots every

20 operations

or

30 seconds.

Snapshots immutable.

Restore creates new version.

Never delete history.

---

# Non Functional Requirements

Typing latency

<16ms

API response

<300ms

Sync replay

<2 seconds

Cold start

<2 seconds

Accessibility

WCAG AA

Responsive

Desktop

Tablet

Morks.

Refresh offline works.

Reconnect sync works.

Conflict merge works.

No data loss.

History restore works.

Authentication secure.

Authorization enforced.

Deployment successful.

README complete.

---

# MVP Definition

The MVP is complete only when all of the following work:

✓ User signs in

✓ Creates document

✓ Goes offline

✓ Continues editing

✓ Refreshes browser

✓ Document persists

✓ Comes online

✓ Sync completes

✓ Opens second browser

✓ Document converges

✓ Restores previous version

✓ AI summarizes document

✓ Viewer cannot edit

✓ Owner can restore history

Only then is the application considered complete.

---

#cal-first over server-first.

Explicit over implicit.

Production quality over assignment quality.

This repository should feel like the first milestone of a real startup rather than a coding assignment. Engineering Philosophy

Correctness over cleverness.

Maintainability over shortcuts.

Determinism over assumptions.

Loobile

---

# Success Metrics

Offline editing w
No exceptions.

---

## Queue

Every edit becomes an Operation.

Operations stored in queue.o I don't manually save.

Acceptance Criteria

✓ Queue persists

✓ Retry woannot delete ownership.

Cannot modify permissions.

---

## Charlie

Viewer

Read only.

Cannot synchronize edoncepts including:

- Offline-first architecture
- Background synchronization
- Deterministic conflict resolution
- Version history
- Role-based collaboration
- Distributed state management
- Data validation
- Secure synchronization
- Production deployment

---

# Product Goals

The primary goal is not to build Google Docs.

The goal is to build the synchronization engine behind Google Docs.

The editor itself should remain intentionally simple.

Engineering complexity belongs in synchronization.

---

# Core Principles

## Principle 1

Editing must never depend on network connectivity.

The application should remain fully usable even if the server disappears for several hours.

---

## Principle 2

Every keystroke should be stored locally before leaving the browser.

The browser owns user work.

---

## Principle 3

Synchronization should happen automatically.

Users should never click "Save."

---

## Principle 4

Synchronization should never overwrite local work.

Merge.

Never replace.

---

## Principle 5

All merges must be deterministic.

Every client should eventually produce the exact same document.

---

## Principle 6

Every important change should be recoverable.

History should be immutable.

---

# Technology Stack

Frontend

- Next.js 16
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui
- Tiptap Editor

Backend

- Next.js Route Handlers
- Prisma
- PostgreSQL

Authentication

- Auth.js

Offline Storage

- Dexie
- IndexedDB

Validation

- Zod

AI

- Gemini

Deployment

- Vercel
- Neon PostgreSQL

- SyncPad

## Local-First Collaborative Document Editor

Version 1.0

Author: Harsh Shah

---

# Overview

SyncPad is a Local-First collaborative document editor designed to demonstrate production-level distributed systems engineering rather than CRUD development.

Unlike traditional editors that rely on constant connectivity, SyncPad assumes that connectivity is unreliable.

Every interaction should remain responsive regardless of network availability.

The browser owns the truth while offline.

The server reconciles truth when connectivity returns.

Users should never lose edits.

Users should never wait for the network.

Users should always understand the synchronization state.

This application is intended to showcase advanced software engineering c
