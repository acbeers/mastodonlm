import { BskyAgent } from "@atproto/api";
import { AppBskyActorDefs, AppBskyGraphDefs } from "@atproto/api";
import { AtUri } from "@atproto/syntax";

import { WorkerBase } from "./workerbase";
import {
  User,
  List,
  APIData,
  ListAnalytics,
  AuthError,
} from "@mastodonlm/shared";

function profile2User(
  profile: AppBskyActorDefs.ProfileView,
  following: boolean,
  follower: boolean
): User {
  const u: User = {
    id: profile.did,
    display_name: profile.displayName || "",
    username: profile.handle,
    avatar: profile.avatar || "",
    acct: profile.handle,
    note: profile.description || "",
    suspended: false,
    limited: false,
    moved: undefined,
    following_count: 0,
    follower_count: 0,
    following: following,
    follower: follower,
    lists: [],
  };
  return u;
}

function makeList(x: AppBskyGraphDefs.ListView): List {
  return {
    id: x.uri,
    title: x.name,
  };
}

interface Params {
  actor: string;
  cursor?: string;
}

async function getAllFollows(agent: BskyAgent, actor: string) {
  let res: User[] = [];
  let ps: Params = { actor };
  while (true) {
    const xx = await agent.getFollows(ps, {});
    res = res.concat(xx.data.follows.map((x) => profile2User(x, true, false)));
    if (!xx.data.cursor) {
      break;
    }
    ps.cursor = xx.data.cursor;
  }
  return res;
}

async function findFollowUri(agent: BskyAgent, actor: string, target: string) {
  let ps: Params = { actor };
  while (true) {
    const xx = await agent.getFollows(ps, {});
    const fol = xx.data.follows.filter((x) => x.did === target);
    if (fol.length === 1) if (fol[0].viewer) return fol[0].viewer.following;
    if (!xx.data.cursor) {
      break;
    }
    ps.cursor = xx.data.cursor;
  }
  return undefined;
}

async function getAllFollowers(agent: BskyAgent, actor: string) {
  let res: User[] = [];
  let ps: Params = { actor };
  while (true) {
    const xx = await agent.getFollowers(ps, {});
    res = res.concat(
      xx.data.followers.map((x) => profile2User(x, false, true))
    );
    if (!xx.data.cursor) {
      break;
    }
    ps.cursor = xx.data.cursor;
  }
  return res;
}

async function getAllLists(agent: BskyAgent, actor: string) {
  let res: List[] = [];
  let ps: Params = { actor };
  while (true) {
    const xx = await agent.api.app.bsky.graph.getLists(ps, {});
    res = res.concat(xx.data.lists.map((x) => makeList(x)));
    if (!xx.data.cursor) {
      break;
    }
    ps.cursor = xx.data.cursor;
  }
  return res;
}

interface ListParams {
  list: string;
  cursor?: string;
}

async function getListUsers(agent: BskyAgent, listid: string) {
  let res: User[] = [];
  let ps: ListParams = { list: listid };
  while (true) {
    const xx = await agent.api.app.bsky.graph.getList(ps, {});
    res = res.concat(
      xx.data.items.map((x) => profile2User(x.subject, false, false))
    );
    if (!xx.data.cursor) {
      break;
    }
    ps.cursor = xx.data.cursor;
  }
  return res;
}

async function getListRecordMap(
  agent: BskyAgent,
  actor: string,
  listid: string
) {
  let res: Record<string, string> = {};
  let ps: ListParams = { list: listid };
  while (true) {
    const xx = await agent.api.app.bsky.graph.getList(ps, {});
    const items = xx.data.items;
    for (const item of items) {
      res[item.subject.did] = item.uri;
    }
    if (!xx.data.cursor) {
      break;
    }
    ps.cursor = xx.data.cursor;
  }
  return res;
}

export class BlueskyWorker extends WorkerBase {
  private agent: BskyAgent | null = null;

  async ready(): Promise<boolean> {
    return this.agent !== null;
  }

  async logout(): Promise<void> {
    this.agent = null;
  }

  // Returns a string with the authorize redirect
  async auth(domain: string): Promise<string> {
    throw Error("Not implemented");
  }

  async login(user: string, pass: string) {
    this.agent = new BskyAgent({
      service: "https://bsky.social",
    });

    return this.agent
      .login({ identifier: user, password: pass })
      .then((res) => {
        this.me = profile2User(res.data, false, false);
        return "http://localhost:3000/manager";
      })
      .catch((err) => {
        if (err.message === "Invalid identifier or password") {
          throw new AuthError();
        }
        // Otherwise we don't know.
        throw new Error("Something went wrong");
      });
  }

  // Given a code, completes the OAuth dance, storing a token for this
  // worker to use to access APIs.
  async callback(code: string, domain: string): Promise<void> {
    await this.auth(domain);
  }

  // Returns information about follows and lists
  // Returns an object of type APIData
  async info(callback: (value: number) => void): Promise<APIData> {
    if (!this.agent || !this.me) throw Error("API not ready");

    const follows = await getAllFollows(this.agent, this.me.id);
    const followers = await getAllFollowers(this.agent, this.me.id);

    const userMap: Record<string, User> = {};
    follows.forEach((u) => {
      userMap[u.id] = u;
    });
    followers.forEach((u) => {
      if (userMap[u.id]) {
        userMap[u.id].follower = true;
      }
    });

    const lists = await getAllLists(this.agent, this.me.id);
    const agent = this.agent;
    const proms = lists.map(async (list) => {
      const ids = await getListUsers(agent, list.id);
      ids.forEach((user) => {
        const uid = user.id;
        // In bluesky, we can list someone who we don't have any relaitonship with.
        // Add them here!
        if (!userMap[uid]) userMap[uid] = user;
        userMap[uid].lists.push(list.id);
      });
    });

    const me = this.me;
    return Promise.all(proms).then(() => {
      return {
        users: Object.values(userMap),
        lists: lists,
        me: me,
      };
    });
  }

  // Creates a new list
  async createList(list_name: string): Promise<List> {
    if (!this.agent || !this.me) throw Error("API not ready");

    const record = {
      purpose: "app.bsky.graph.defs#curatelist",
      name: list_name,
      createdAt: new Date().toISOString(),
    };
    const crparams = { repo: this.me.id };
    const cr = await this.agent.api.app.bsky.graph.list.create(
      crparams,
      record
    );
    return {
      id: cr.uri,
      title: list_name,
    };
  }

  // Deletes a list
  async deleteList(list_id: string): Promise<void> {
    if (!this.agent || !this.me) throw Error("API not ready");

    // Parse the rkey out of the URI
    const uri = new AtUri(list_id);
    const rec = { rkey: uri.rkey, repo: this.me.id };
    await this.agent.api.app.bsky.graph.list.delete(rec);
  }

  // Adds a user to a list
  async addToList(list_id: string, follower_id: string): Promise<void> {
    if (!this.agent || !this.me) throw Error("API not ready");

    const crec = {
      subject: follower_id,
      list: list_id,
      createdAt: new Date().toISOString(),
    };
    const crparams = { repo: this.me.id };
    await this.agent.api.app.bsky.graph.listitem.create(crparams, crec);
  }

  // Removes a user from a list
  async removeFromList(list_id: string, follower_id: string): Promise<void> {
    if (!this.agent || !this.me) throw Error("API not ready");

    // FIXME: This one is harder, as an item has its own uri/rkey that I
    // do not store anywhere, and have to place to store.
    // I could enumerate list items on each delete, but that would be expensive
    // when doing lots of removals.
    // A List could contain a service-specific representation of follows, which
    // these methods could update.  Then the calling application would have to
    // update its own representation (e.g. on users)

    // For now, to get things working, do the dumb method.
    const userMap = await getListRecordMap(this.agent, this.me.id, list_id);
    if (userMap[follower_id]) {
      const uri = new AtUri(userMap[follower_id]);
      const rec = { rkey: uri.rkey, repo: this.me.id };
      await this.agent.api.app.bsky.graph.listitem.delete(rec);
    }
  }

  // Creates a new list and imports data into it
  async importList(list_name: string, account_ids: string[]): Promise<void> {
    throw Error("Not implemented");
  }

  // Computes analytics for the given list
  async listAnalytics(list: List): Promise<ListAnalytics> {
    throw Error("Not implemented");
  }

  // Follows an account
  async follow(userid: string): Promise<void> {
    if (!this.agent || !this.me) throw Error("API not ready");
    this.agent.follow(userid);
  }

  // Unfollows an account
  async unfollow(userid: string): Promise<void> {
    if (!this.agent || !this.me) throw Error("API not ready");
    // FIXME: To unfollow, we need the follow URI, which is contained
    // in the viewer.following profile item.
    // Our User object doesn't store this.

    // For now, we'll do this inefficiently.
    const uri = await findFollowUri(this.agent, this.me.id, userid);
    if (uri) await this.agent.deleteFollow(uri);
  }

  // Follow a list of accounts by name (not ID)
  async follow_by_names(names: string[]): Promise<User[]> {
    throw Error("Not implemented");
  }
}
