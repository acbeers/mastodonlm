// Info / read operations

// Functions for following and unfollowing accounts
import type { mastodon } from "masto";
import { List, User } from "./types";
import { account2User } from "./utils";

// Convenient type aliases
type Client = mastodon.Client;

interface Meta {
  me: User;
  lists: List[];
}

async function asyncForEach(
  array: any[],
  callback: (a: any, n: number, x: any[]) => void
) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

// Returns metadata about me and my lists
export async function info_meta(masto: Client, domain: string): Promise<Meta> {
  return masto.v1.accounts.verifyCredentials().then(async (me) => {
    const meuser = {
      id: me.id,
      display_name: me.displayName,
      username: me.username,
      avatar: me.avatar,
      acct: me.acct + "@" + domain,
      note: me.note,
      lists: [],
      following_count: me.followingCount,
      follower_count: me.followersCount,
      following: false,
      follower: false,
      limited: false,
      suspended: false,
    };
    // Now fetch lists.
    let mylists: List[] = [];
    for await (const lists of masto.v1.lists.list()) {
      const batch: List[] = lists.map((list) => ({
        id: list.id,
        title: list.title,
      }));
      mylists = mylists.concat(batch);
    }

    const res = { me: meuser, lists: mylists };
    return res;
  });
}

// Returns list of accounts I follow
export async function info_following(
  masto: Client,
  user_id: string | null,
  domain: string,
  callback: ((num_loaded: number) => void) | null
): Promise<User[]> {
  let meid = user_id;
  if (!meid)
    await masto.v1.accounts.verifyCredentials().then((me) => {
      meid = me.id;
    });

  if (meid) {
    // First people that we are following
    let following: User[] = [];
    for await (const users of masto.v1.accounts.listFollowing(meid)) {
      const batch: User[] = users.map((acct) => {
        const u = account2User(acct, true, false, domain);
        //userMap[u.id] = u;
        return u;
      });
      following = following.concat(batch);
      //callback((100 * following.length) / (totalrels + data.lists.length));
      if (callback) callback(following.length);
    }
    return following;
  }
  return [];
}

// Returns list of accounts that follow the givenuser
export async function info_followers(
  masto: Client,
  user_id: string | null,
  domain: string,
  callback: ((num_loaded: number) => void) | null
): Promise<User[]> {
  let meid = user_id;
  if (!meid)
    await masto.v1.accounts.verifyCredentials().then((me) => {
      meid = me.id;
    });

  if (meid) {
    // First people that we are following
    let followers: User[] = [];
    for await (const users of masto.v1.accounts.listFollowers(meid)) {
      const batch: User[] = users.map((acct) => {
        const u = account2User(acct, false, true, domain);
        //userMap[u.id] = u;
        return u;
      });
      followers = followers.concat(batch);
      //callback((100 * following.length) / (totalrels + data.lists.length));
      if (callback) callback(followers.length);
    }
    return followers;
  }
  return [];
}

// Return lists and the accounts on them
export async function info_lists(
  masto: Client,
  callback: ((num_loaded: number) => void) | null
): Promise<Record<string, string[]>> {
  // Get info about lists
  let mylists: List[] = [];
  for await (const lists of masto.v1.lists.list()) {
    const batch: List[] = lists.map((list) => ({
      id: list.id,
      title: list.title,
    }));
    mylists = mylists.concat(batch);
  }
  // Now, for each list, get users from that list.
  const res: Record<string, string[]> = {};
  await asyncForEach(mylists, async (list, idx) => {
    res[list.id] = [];
    for await (const users of masto.v1.lists.listAccounts(list.id)) {
      res[list.id] = res[list.id].concat(users.map((u) => u.id));
      //callback((100 * (totalrels + idx)) / (totalrels + data.lists.length));
    }
    if (callback) callback(idx);
  });

  return res;
}
