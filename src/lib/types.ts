export type MediaType = "image" | "video" | "document";
export type PostType = "post" | "photo" | "story" | "recipe";
export type PostStatus = "draft" | "published";
export type MemberRole = "kinkeeper" | "member";

export interface Family {
  id: string;
  name: string;
  tagline: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: MemberRole;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface Post {
  id: string;
  family_id: string;
  author_id: string;
  content: string | null;
  type: PostType;
  status: PostStatus;
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: MediaType;
  caption: string | null;
  created_at: string;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface Message {
  id: string;
  family_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
}

export interface GardenItem {
  id: string;
  family_id: string;
  uploaded_by: string;
  title: string | null;
  description: string | null;
  media_url: string;
  media_type: MediaType;
  folder: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface Invite {
  id: string;
  family_id: string;
  invited_by: string;
  email: string | null;
  invite_code: string;
  accepted: boolean;
  created_at: string;
}

// Composite shapes used by the UI.
export interface FeedPost extends Post {
  author: Pick<FamilyMember, "display_name" | "avatar_url"> | null;
  media: PostMedia[];
  reactions: Reaction[];
  comments: (Comment & {
    author: Pick<FamilyMember, "display_name" | "avatar_url"> | null;
  })[];
}
