import type { mastodon } from "masto";
import { User } from "./types";

export function account2User(
  account: mastodon.v1.Account,
  following: boolean,
  follower: boolean,
  domain: string | null
): User {
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
    following_count: 0,
    follower_count: 0,
    following: following,
    follower: follower,
    lists: [],
  };
}
