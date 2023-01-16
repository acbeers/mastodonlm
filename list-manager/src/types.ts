// Types use in the Mastodon List Manager

// A list returned by a Mastodon API
export type List = {
  id: number;
  title: string;
};

// A user returned by the Mastodon API
export type User = {
  id: number;
  display_name: string;
  username: string;
  avatar: string;
  acct: string;
  note: string;
  lists: number[];
};

// A group of users as shown in the interface
export type Group = {
  key: string;
  followers: User[];
};

// The data returned by our backend API
export type APIData = {
  followers: User[];
  lists: List[];
  me: User | null;
};

// A data structure representing an in progress list operation
export type InProgress = {
  list: number;
  follower: number;
};
