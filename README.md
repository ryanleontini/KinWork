# KinOS 🌿

A private family platform — a cozy home for your family's stories, photos, and
traditions. Think a family-only social feed plus a digital vault, wrapped in a
warm greenhouse/scrapbook aesthetic.

Built with **Next.js 16 (App Router)**, **Supabase** (auth, database, storage,
realtime), **Tailwind CSS v4**, and **TypeScript**.

## Features

- **Auth** — email/password sign up & sign in; create a family or join one with an invite code.
- **Home** — reverse-chronological family feed with photos, hearts, and inline comments.
- **Chat** — realtime family group chat with image attachments.
- **Garden** — a media vault with type filters, folders, search, and uploads.
- **Workbench** — create richer content (Memory, Recipe, Story, Free Post), pull images from the Garden, publish or save drafts.
- **Family** — manage members, generate invite links, edit family name/photo, leave, log out.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a Supabase project, then copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Create the database

In the Supabase **SQL editor**, run the contents of [`schema.sql`](./schema.sql).
This creates all tables, row-level-security policies, the `media` storage
bucket, and enables realtime on the `messages` table.

### 4. (Optional) Load demo data

Run [`seed.sql`](./seed.sql) in the SQL editor to populate "The Miller Family"
with members, posts, comments, reactions, garden items, and chat messages.

Demo logins (all password `password123`):

| Email | Role |
|-------|------|
| `grandma@miller.family` | kinkeeper |
| `mike@miller.family` | member |
| `jenny@miller.family` | member |

### 5. Auth settings

For a frictionless demo, disable email confirmation in
**Supabase → Authentication → Sign In / Providers → Email → "Confirm email"**.
With it enabled, new sign-ups must confirm via email before signing in.

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- This Next.js version renames `middleware` to `proxy` — see `src/proxy.ts`,
  which refreshes the Supabase session and gates authenticated routes.
- All data access goes through Supabase with RLS enforcing family-scoped access.
