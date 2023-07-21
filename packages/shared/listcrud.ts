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
