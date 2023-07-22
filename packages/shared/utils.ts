import type { mastodon } from "masto";
import { User } from "./types";

// A version of the Account class with properties that are returned
// by later versions of the API, even if they are unknown to the
// Typescript definition in masto.js
//
// This type can be eliminated when masto.js is updated to support
// these properties
//
interface Account_v415 {
  id: string;
  displayName: string;
  avatar: string;
  acct: string | null;
  note: string;
  suspended: boolean | null;
  limited: boolean | null;
}

export function account2User(
  account: mastodon.v1.Account,
  following: boolean,
  follower: boolean,
  domain: string | null
): User {
  const v415 = account as unknown as Account_v415;

  return {
    id: account.id,
    display_name: account.displayName,
    username: account.username,
    avatar: account.avatar,
    acct:
      account.acct && account.acct.indexOf("@") > 0
        ? account.acct
        : account.acct + "@" + domain,
    note: account.note,
    suspended: account.suspended || false,
    limited: v415.limited || false,
    following_count: 0,
    follower_count: 0,
    following: following,
    follower: follower,
    lists: [],
  };
}
