// Types use in the Mastodon List Manager

// A list returned by a Mastodon API
export type List = {
  id: string;
  title: string;
};

export enum Relationship {
  Unknown = "unknown",
  Follower = "follower",
  Following = "following",
  Mutual = "mutual",
}

// A user returned by the Mastodon API
export type User = {
  id: string;
  display_name: string;
  username: string;
  avatar: string;
  acct: string;
  note: string;
  lists: string[];
  following_count: number;
  follower_count: number;
  // Our relationships
  following: boolean;
  follower: boolean;
};

// A group of users as shown in the interface
export type Group = {
  key: string;
  users: User[];
};

// The data returned by our backend API
export type APIData = {
  users: User[];
  lists: List[];
  me: User;
};

// Analytics data for a list
export type ListAnalytics = {
  list_id: string;
  list_name: string;
  latest_post: Date;
  earliest_post: Date;
  num_posts: number;
  num_orig_posts: number;
  num_boosts: number;
  num_replies: number;
  top_posters: { acct: User; count_orig: number; count_boost: number }[];
  top_boosts: { acct: User; count: number }[];
};

// A data structure representing an in progress list operation
export type InProgress = {
  list: string;
  follower: string;
};

export class TimeoutError extends Error {
  constructor(msg: string) {
    super();
    this.name = "TimeoutError";
    this.message = msg;
  }
}

export class AuthError extends Error {
  constructor() {
    super();
    this.name = "AuthError";
    this.message = "Not authenticated";
  }
}
