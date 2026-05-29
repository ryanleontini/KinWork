<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This project uses Next.js 16 + React 19 + Tailwind v4. Notable breaking changes vs. older versions:
- `cookies()`, `headers()`, and route `params`/`searchParams` are **async** (await them).
- The `middleware.ts` convention is renamed to **`proxy.ts`** (export a `proxy` function).
- Tailwind v4 is configured via CSS `@theme` in `globals.css` (no `tailwind.config.js`).
Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code.
<!-- END:nextjs-agent-rules -->

# KinOS MVP — Agents.md

## What is KinOS?

KinOS is a private family platform where families can share, preserve, and celebrate their stories, photos, and traditions together. Think of it as a family-only social network combined with a digital vault for preserving family heritage. The app uses a garden/conservatory metaphor throughout — families "grow" their shared history by contributing content.

The primary user (called the "kinkeeper") creates a family, invites members, and sets the tone. But all members can contribute.

## Target User

Non-technical family members ages 20–80. The UI must be dead simple. If a grandmother can't figure out how to post a photo in under 30 seconds, the design has failed.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database / Auth / Storage / Realtime**: Supabase
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (or `next start` locally)
- **Language**: TypeScript

Do NOT use any other database, auth provider, or storage solution. Everything goes through Supabase.

## Supabase Setup

The developer will need to create a Supabase project and provide these env vars:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use `@supabase/supabase-js` and `@supabase/ssr` for auth/session handling in Next.js.

## Database Schema

### `families`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| name | text | e.g., "The Miller Family" |
| tagline | text (nullable) | e.g., "Here's what's been happening lately." |
| photo_url | text (nullable) | Family profile photo |
| created_by | uuid (FK → auth.users) | The kinkeeper |
| created_at | timestamptz | |

### `family_members`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| family_id | uuid (FK → families) | |
| user_id | uuid (FK → auth.users) | |
| role | text | 'kinkeeper' or 'member' |
| display_name | text | |
| avatar_url | text (nullable) | |
| joined_at | timestamptz | |

### `posts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| family_id | uuid (FK → families) | |
| author_id | uuid (FK → auth.users) | |
| content | text (nullable) | Text content of the post |
| type | text | 'post', 'photo', 'story', 'recipe' |
| created_at | timestamptz | |

### `post_media`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| post_id | uuid (FK → posts) | |
| media_url | text | Supabase Storage URL |
| media_type | text | 'image', 'video', 'document' |
| caption | text (nullable) | |
| created_at | timestamptz | |

### `reactions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| post_id | uuid (FK → posts) | |
| user_id | uuid (FK → auth.users) | |
| emoji | text | Default '❤️' — MVP only needs hearts |
| created_at | timestamptz | |
| | | UNIQUE(post_id, user_id) |

### `comments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| post_id | uuid (FK → posts) | |
| author_id | uuid (FK → auth.users) | |
| content | text | |
| created_at | timestamptz | |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| family_id | uuid (FK → families) | |
| sender_id | uuid (FK → auth.users) | |
| content | text | |
| media_url | text (nullable) | Optional image attachment |
| created_at | timestamptz | |

### `garden_items`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| family_id | uuid (FK → families) | |
| uploaded_by | uuid (FK → auth.users) | |
| title | text (nullable) | User-given title |
| description | text (nullable) | |
| media_url | text | Supabase Storage URL |
| media_type | text | 'image', 'video', 'document' |
| folder | text (nullable) | e.g., "Christmas 2024", "Recipes" |
| tags | text[] (nullable) | |
| created_at | timestamptz | |

### `invites`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| family_id | uuid (FK → families) | |
| invited_by | uuid (FK → auth.users) | |
| email | text (nullable) | |
| invite_code | text (UNIQUE) | Short joinable code |
| accepted | boolean | Default false |
| created_at | timestamptz | |

### Supabase Storage Buckets
- `media` — public bucket for all uploaded images, videos, documents

### Row Level Security
Enable RLS on ALL tables. Policies:
- Users can only read/write data for families they belong to (check `family_members` table)
- Anyone with a valid invite code can join a family
- Only kinkeepers can delete family content or remove members

## App Structure

```
app/
├── (auth)/
│   ├── login/page.tsx          # Email + password login
│   ├── signup/page.tsx         # Email + password signup
│   └── join/[code]/page.tsx    # Accept invite via link
├── (app)/
│   ├── layout.tsx              # Authenticated layout with bottom nav
│   ├── home/page.tsx           # Home — activity feed
│   ├── chat/page.tsx           # Chat — family group messaging
│   ├── garden/page.tsx         # Garden — media vault/library
│   ├── workbench/page.tsx      # Workbench — create content
│   └── family/page.tsx         # Family — settings & members
├── layout.tsx                  # Root layout
└── page.tsx                    # Redirect to /home or /login
```

## Pages — Detailed Specs

### Auth: Login & Signup
- Simple email + password auth via Supabase Auth
- After signup, prompt: "Create a family" or "Join a family (enter invite code)"
- If creating: collect family name → create family + family_member record (role: kinkeeper)
- If joining: validate invite code → create family_member record (role: member)
- Redirect to /home after completion

### 1. Home (Activity Feed)
**Route**: `/home`
**Nav icon**: Home icon
**Purpose**: See what's happening in the family

- Reverse-chronological feed of posts
- Each post card shows: author avatar + name, timestamp, text content, attached images (if any), heart count + comment count
- Tap heart to like/unlike
- Tap comment count to expand inline comments and add one
- Floating "+" button in bottom-right to create a quick post (text + optional photo)
- Pull content from `posts` table joined with `post_media`, `reactions`, `comments`

### 2. Chat (Family Messaging)
**Route**: `/chat`
**Nav icon**: Message bubble icon
**Purpose**: Real-time family group chat

- Single group chat for the whole family (MVP — no DMs, no threads)
- Messages appear in chronological order, auto-scroll to bottom
- Text input at bottom with send button and image attach button
- Each message shows: sender name, avatar, timestamp, content
- Use Supabase Realtime subscriptions on the `messages` table for live updates
- Load last 50 messages on mount, "Load more" button to paginate backward

### 3. Garden (Vault)
**Route**: `/garden`
**Nav icon**: Plant/leaf icon
**Purpose**: Browse and organize all stored family media

- Grid view of all uploaded media (photos as thumbnails, documents as file icons)
- Filter bar at top: All | Photos | Videos | Documents
- Folder chips: show existing folders, tap to filter. "All" selected by default
- Search bar to search by title or description
- Tap an item to open a detail view (full image, title, description, who uploaded, when)
- Upload button: select file(s), add optional title/description/folder, upload to Supabase Storage, create `garden_items` record
- Ability to create new folders

### 4. Workbench (Create Content)
**Route**: `/workbench`
**Nav icon**: Hammer/tool icon
**Purpose**: Create richer family content like stories and recipe cards

- Landing state: grid of template cards the user can pick from:
  - **Memory**: Write a story with photos (title + rich text + image attachments)
  - **Recipe**: Title, ingredients list, instructions, photo
  - **Story**: Long-form text with a title and cover photo
  - **Free Post**: Simple text + images (same as home quick-post but with more editing room)
- Each template opens a simple form/editor
- User can pull images from the Garden (media picker that queries `garden_items`) or upload new ones
- "Publish" saves to `posts` table (with appropriate `type`) and shows on Home feed
- "Save Draft" stores with a `draft` status (add `status` column: 'draft' | 'published' to posts if needed)

### 5. Family (Settings)
**Route**: `/family`
**Nav icon**: Users/people icon
**Purpose**: Manage family members and settings

- Family name and photo at top (editable by kinkeeper)
- Member list with avatars, names, roles
- "Invite" button: generates a unique invite code and shareable link (`/join/[code]`)
  - Option to copy link or share via system share sheet
- Kinkeeper-only actions: remove member, edit family name/photo
- "Leave Family" button for non-kinkeeper members
- "Log Out" button at bottom

## Navigation

Bottom tab bar with 5 tabs, always visible on all app pages:
- Home (house icon)
- Chat (message bubble icon)
- Garden (plant icon)
- Workbench (hammer icon)
- Family (people icon)

Active tab highlighted. Show unread badge on Chat if there are new messages since last visit.

## Design Direction

### Aesthetic
- **Warm, organic, inviting** — not corporate or techy
- Think: a cozy greenhouse meets a family scrapbook
- Cream/warm-white backgrounds, not pure white (#FDFBF7 or similar)
- Accent color: earthy green (like #5B7F5B or similar sage/olive green)
- Secondary accent: warm terracotta/rust (#C17B4A or similar)
- Typography: use a warm, readable font — nothing cold or geometric. A soft serif for headings (like Lora or Playfair Display) and a clean sans-serif for body text (like Nunito or DM Sans)
- Rounded corners on everything (12-16px border-radius)
- Subtle botanical illustrations or leaf motifs as decorative elements where appropriate (empty states, loading screens, onboarding)
- Soft shadows, no hard borders

### Tone
- Friendly, gentle copy throughout
- Empty states should feel encouraging: "Your garden is waiting for its first memory" not "No items found"
- Error messages should be kind: "Something went sideways — want to try again?"

### Mobile-First
- Design for mobile viewport first (375px)
- Desktop should work but is not the priority
- Bottom nav bar (not sidebar) on all screen sizes for MVP

## What NOT to Build (Out of Scope for MVP)

- No notifications or push notifications
- No direct messages (just group chat)
- No video calling
- No family tree visualization
- No wisdom library, liturgies, or journal (these are post-MVP features from the client's expanded vision)
- No AI features
- No payment or subscription system
- No onboarding tutorial beyond the create/join family flow
- No dark mode (stick with warm light theme)
- No i18n

## Seed Data for Demo

After building, create a SQL seed script or a seeding utility that populates:
- One family: "The Miller Family" with tagline "Here's what's been happening lately."
- 3 members: "Grandma Sarah" (kinkeeper), "Mike Miller", "Jenny Miller"
- 5–8 sample posts with varied types (a couple with images, one recipe, one story)
- A handful of comments and reactions
- 10+ garden items across 2–3 folders ("Lake House Trip '98", "Family Recipes")
- A few chat messages

Use placeholder images from `https://picsum.photos/` for any sample photos.

## Environment & Deployment

1. Initialize with `npx create-next-app@latest kinos --typescript --tailwind --app --src-dir`
2. Install: `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react` (for icons)
3. Create `.env.local` with Supabase credentials
4. Provide a `schema.sql` file that can be run in Supabase SQL editor to create all tables, RLS policies, and storage buckets
5. Provide a `seed.sql` file with demo data
6. App should run with `npm run dev` out of the box after env vars are set
7. Deploy to Vercel with `vercel --prod` or connect via GitHub

## Final Checklist

- [ ] Auth flow works (signup, login, create family, join via code)
- [ ] Home feed shows posts with likes and comments
- [ ] Chat sends and receives messages in real time
- [ ] Garden displays uploaded media in a grid with folders and filters
- [ ] Workbench lets you create at least a Memory and a Recipe and publish to feed
- [ ] Family page shows members, allows invites, basic settings
- [ ] Bottom nav works on all pages
- [ ] Warm garden-themed visual design throughout
- [ ] Seed data loads and the demo feels alive
- [ ] No console errors, no broken links, no dead ends
