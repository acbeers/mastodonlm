// List CRUD operations

// Functions for following and unfollowing accounts
import type { mastodon } from "masto";
import { List } from "./types";

// Convenient type aliases
type Client = mastodon.Client;

// Creates a new list
export async function list_create(
  masto: Client,
  list_name: string
): Promise<List> {
  return masto.v1.lists.create({ title: list_name });
}

// Deletes a list
export async function list_delete(
  masto: Client,
  list_id: string
): Promise<void> {
  masto.v1.lists.remove(list_id);
}

// Adds a user to a list
export async function list_add(
  masto: Client,
  list_id: string,
  follower_ids: string[]
): Promise<void> {
  return masto.v1.lists.addAccount(list_id, { accountIds: follower_ids });
}

// Removes a user from a list
export async function list_remove(
  masto: Client,
  list_id: string,
  follower_ids: string[]
): Promise<void> {
  return masto.v1.lists.removeAccount(list_id, {
    accountIds: follower_ids,
  });
}

// Imports users (by acct name) to a list
//
export async function list_import(
  masto: Client,
  list_name: string,
  account_ids: string[]
): Promise<void> {
  // Create a new list to import these accounts to.
  return masto.v1.lists.create({ title: list_name }).then((newlist) => {
    const list_id = newlist.id;
    // Data needs to be translated into account IDs, not acct strings.
    const proms = account_ids.map((acct) => masto.v1.accounts.lookup({ acct }));
    // Now, add those accounts
    // NOTE: If we aren't following these accounts, we'll throw an error.
    return Promise.all(proms).then((accts) => {
      const ids = accts.map((x) => x.id);
      return masto.v1.lists.addAccount(list_id, { accountIds: ids });
    });

    // FIXME: If data is too long, we might get into problems.
    // FIXME: We should offer to follow accounts that we aren't following already.
    // But, that API is one account at a time, so could run afoul of API limits.
    // FIXME: Perhaps I just need to have a limit of e.g. 50 accounts, plus go to
    // some efforts to not do any work for accounts that I already know about.
  });
}
