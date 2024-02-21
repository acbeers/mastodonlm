// Functions for following and unfollowing accounts
import type { mastodon } from "masto";
import { User } from "./types";
import { account2User } from "./utils";

// Convenient type aliases
type Client = mastodon.Client;

export async function follow(masto: Client, userid: string): Promise<void> {
  return masto.v1.accounts.follow(userid).then(() => {});
}

// Follows an account
export async function unfollow(masto: Client, userid: string): Promise<void> {
  await masto.v1.accounts.unfollow(userid);
}

// Looks up a list of accounts
export async function lookup(masto: Client, names: string[]): Promise<User[]> {
  const proms = names.map((acct) =>
    masto.v1.accounts.lookup({ acct }).catch(() => null)
  );
  return Promise.all(proms)
    .then((accts) => accts.filter((v) => v))
    .then((accts: mastodon.v1.Account[]) =>
      accts.map((x) => account2User(x, false, false, null))
    );
}

// Follows a list of accounts by account name
//
export async function follow_by_names(
  masto: Client,
  names: string[]
): Promise<User[]> {
  // Lookup accounts first.
  // TODO: Here we ignore accounts that fail lookup. Better would be to report
  // them as failed.
  const proms = names.map((acct) =>
    masto.v1.accounts.lookup({ acct }).catch(() => null)
  );
  // Now, using these account objects, follow them
  // Filter out nulls first.
  return Promise.all(proms)
    .then((accts) => accts.filter((v) => v))
    .then((accts: mastodon.v1.Account[]) => {
      const ids = accts.map((x) => x.id);
      const proms = ids.map((id) => masto.v1.accounts.follow(id));
      return Promise.all(proms).then(() =>
        // TODO: Need a better value for domain here other than null
        // For my use right now, it doesn't matter very much.
        accts.map((x) => account2User(x, false, false, null))
      );
    });
}
