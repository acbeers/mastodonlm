// Types use in the Mastodon List Manager

// A list of users
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

// A user / profile
export type User = {
  id: string;
  display_name: string;
  username: string;
  avatar: string;
  acct: string;
  note: string;
  lists: string[];
  suspended: boolean;
  limited: boolean;
  following_count: number;
  follower_count: number;
  // The account that we have moved to
  moved: User | undefined;
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

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class AuthError extends Error {
  constructor() {
    super();
    this.name = "AuthError";
    this.message = "Not authenticated";

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

// An error that indicates a bad hostname
export class BadHostError extends Error {
  constructor() {
    super();
    this.name = "BadHostError";
    this.message = "Invalid hostname";

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, BadHostError.prototype);
  }
}

// An error that indicates a host that we have blocked from using the app.
// possibly due to network or version problems
export class BlockedHostError extends Error {
  constructor() {
    super();
    this.name = "BlockedHostError";
    this.message = "Host blocked";

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, BlockedHostError.prototype);
  }
}

// An error that indicates a host that we have blocked from using the app.
// possibly due to network or version problems
export class NotAllowedError extends Error {
  constructor() {
    super();
    this.name = "NotAllowedError";
    this.message = "Host not allowed";

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, NotAllowedError.prototype);
  }
}
