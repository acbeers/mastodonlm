// Functions for following and unfollowing accounts
import type { mastodon } from "masto";

// Convenient type aliases
type Client = mastodon.Client;

export async function follow(masto: Client, userid: string): Promise<void> {
  return masto.v1.accounts.follow(userid).then(() => {});
}

// Follows an account
export async function unfollow(masto: Client, userid: string): Promise<void> {
  await masto.v1.accounts.unfollow(userid);
}
