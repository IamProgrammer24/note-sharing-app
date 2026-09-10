# Secure Note Sharing App

A secure note-sharing application built for the MERN/PERN Stack Developer POC assessment.

Users can create notes and share them using secure links. Each link can be public or password-protected and can support either one-time access or time-based expiry.

## Features

- User registration and login
- JWT authentication using an HTTP-only cookie
- Protected note creation
- Create notes with title and content
- Public share links
- Password-protected share links
- Cryptographically secure share tokens
- Dynamically generated access keys
- Bcrypt-hashed access keys
- One-time access links
- Time-based expiry links
- Revoke/invalidate share links
- Successful view-count tracking
- Wrong password does not increase view count
- Atomic protection against simultaneous one-time access
- Owner-only note management
- Invalid, expired, revoked, and already-used link handling
- Responsive interface using Tailwind CSS and shadcn/ui

## Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Axios

### Backend

- Hono.js
- TypeScript
- Node.js
- Zod
- bcryptjs
- JSON Web Tokens

### Database

- PostgreSQL
- Prisma ORM
- Neon PostgreSQL

## Project Structure

```text
note-sharing-app/
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── notes/
│   │   │   │   ├── new/
│   │   │   │   └── [id]/
│   │   │   └── share/
│   │   │       └── [token]/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
│
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── lib/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── notes.ts
│   │   │   └── share.ts
│   │   └── index.ts
│   └── package.json
│
└── README.md
```

## Local Setup

### Requirements

- Node.js 22 or newer
- PostgreSQL database
- npm
- Git

### Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd note-sharing-app
```

## Backend Setup

Open a terminal inside the `server` folder:

```bash
cd server
npm install
```

Create a file named `.env` inside the `server` folder:

```env
DATABASE_URL="YOUR_POSTGRESQL_CONNECTION_STRING"
JWT_SECRET="YOUR_LONG_RANDOM_SECRET"
CLIENT_URL="http://localhost:3000"
NODE_ENV="development"
```

Never commit the `.env` file to GitHub.

Generate the Prisma client:

```bash
npx prisma generate
```

Run the database migration:

```bash
npx prisma migrate dev
```

Start the backend:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

## Frontend Setup

Open another terminal inside the `client` folder:

```bash
cd client
npm install
```

Create a file named `.env.local` inside the `client` folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

## Database Schema

The main database models are:

### User

Stores registered users.

- `id`
- `email`
- `passwordHash`
- `createdAt`
- `updatedAt`

### Note

Stores note content and its owner.

- `id`
- `title`
- `content`
- `ownerId`
- `createdAt`
- `updatedAt`

### ShareLink

Stores sharing and access-control information.

- `id`
- `token`
- `noteId`
- `shareType`
- `accessType`
- `passwordHash`
- `expiresAt`
- `usedAt`
- `revokedAt`
- `viewCount`
- `createdAt`

## Share Link Logic

### Share type

#### One-time access

A one-time link can be successfully opened only once.

After the first successful public view or password unlock:

- `usedAt` is set
- `viewCount` increases by one
- Future requests return `410 Gone`

#### Time-based access

A time-based link remains available until its expiry time.

Every successful view or unlock increases `viewCount` by one.

### Access type

#### Public access

The note can be opened without a password.

#### Password-protected access

The server generates a random access key. Only the bcrypt hash is stored in the database.

The original access key is shown only once after note creation.

The access key is never returned by the note-management API.

## Security Decisions

### Password storage

User passwords and share access keys are never stored as plain text.

They are hashed using bcrypt:

```text
bcrypt hash with 12 salt rounds
```

### Secure share tokens

Share tokens are generated using Node.js cryptographically secure random bytes.

The server does not use predictable IDs or timestamps as share tokens.

### HTTP-only authentication cookie

The JWT session token is stored in an HTTP-only cookie.

This prevents normal client-side JavaScript from directly reading the session token.

### Owner authorization

The note-detail endpoint checks both:

```text
note ID
owner ID from the authenticated session
```

A user cannot view or revoke another user's note by changing the note ID.

### One-time race-condition protection

One-time links are consumed using an atomic conditional database update.

The update succeeds only when:

```text
usedAt IS NULL
revokedAt IS NULL
expiresAt is still valid
```

Only the request that successfully updates the database can consume the link.

Therefore, if two users request the same one-time link simultaneously:

```text
Request 1: 200 OK
Request 2: 410 Gone
```

The final view count remains exactly:

```text
1
```

### View-count protection

The view count increases only after successful access.

| Request                |  View count |
| ---------------------- | ----------: |
| Public successful view |   Increases |
| Correct password       |   Increases |
| Wrong password         | No increase |
| Invalid link           | No increase |
| Expired link           | No increase |
| Revoked link           | No increase |
| Already-used link      | No increase |

### Brute-force protection

For production deployment, password-protected unlock attempts should be rate-limited by:

- Share token
- IP address
- Time window

After multiple failed attempts, the server should temporarily block further attempts.

A production implementation could use Redis or another shared rate-limit store so that the limit works across multiple server instances.

## API Endpoints

### Authentication

| Method | Endpoint             | Description                        |
| ------ | -------------------- | ---------------------------------- |
| POST   | `/api/auth/register` | Register a new user                |
| POST   | `/api/auth/login`    | Login and create a session         |
| GET    | `/api/auth/me`       | Get the current authenticated user |

### Notes

| Method | Endpoint                | Description                  |
| ------ | ----------------------- | ---------------------------- |
| POST   | `/api/notes`            | Create a note and share link |
| GET    | `/api/notes/:id`        | Get owner-only note details  |
| POST   | `/api/notes/:id/revoke` | Revoke the note's share link |

### Shared Notes

| Method | Endpoint                   | Description                                      |
| ------ | -------------------------- | ------------------------------------------------ |
| GET    | `/api/share/:token`        | Open a public link or check password requirement |
| POST   | `/api/share/:token/unlock` | Unlock a password-protected link                 |

## Required Pages

| Page             | Purpose                              |
| ---------------- | ------------------------------------ |
| `/login`         | User login                           |
| `/register`      | User registration                    |
| `/notes/new`     | Create a secure note                 |
| `/notes/[id]`    | View note details and manage sharing |
| `/share/[token]` | Open a shared note                   |

## Manual Testing Checklist

### Authentication

- Register with valid details
- Reject invalid email
- Reject short password
- Reject duplicate email
- Login with correct credentials
- Reject incorrect credentials
- Access protected route without login

### Note creation

- Create public one-time note
- Create password-protected one-time note
- Create public time-based note
- Create password-protected time-based note
- Reject time-based note without expiry
- Allow one-time note without expiry

### Share links

- Public link opens successfully
- Protected link asks for an access key
- Wrong access key returns `401`
- Correct access key opens the note
- Invalid token returns `404`
- Expired link returns `410`
- Revoked link returns `410`
- One-time link returns `410` after successful use
- Time-based link remains available before expiry

### View count

- Successful public view increases the count
- Successful password unlock increases the count
- Wrong password does not increase the count
- Expired link does not increase the count
- Revoked link does not increase the count
- Simultaneous one-time requests produce one success and one `410`

## Demo Flow

The demonstration should show:

1. User registration
2. User login
3. Note creation
4. Secure share-link generation
5. Dynamic access-key generation
6. Public share-link access
7. Password-protected access
8. Wrong-password rejection
9. One-time link expiry
10. Time-based expiry
11. Revoke functionality
12. View-count update
13. Simultaneous one-time-link protection

## Future Improvements

- Redis-based rate limiting
- Refresh-token authentication
- Multiple share links per note
- Edit and delete notes
- Pagination
- Search and filtering
- Markdown note support
- Email sharing
- Production logging and monitoring
- Automated integration tests

## License

This project was created as a technical assessment project.
