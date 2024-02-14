import { login } from "masto";
import { WorkerBase } from "./workerbase";
import {
  fetchAnalytics,
  follow,
  unfollow,
  follow_by_names,
  list_create,
  list_delete,
  list_add,
  list_remove,
  info_meta,
  info_following,
  info_followers,
  info_lists,
} from "@mastodonlm/shared";

import {
  User,
  List,
  Post,
  APIData,
  ListAnalytics,
  TimeoutError,
  AuthError,
  BadHostError,
  BlockedHostError,
  NotAllowedError,
  account2User,
} from "@mastodonlm/shared";

// Endpoints
const urlAuth = process.env.REACT_APP_BACKEND_URL + "/auth";
const urlCallback = process.env.REACT_APP_BACKEND_URL + "/clientcallback";
const urlLogout = process.env.REACT_APP_BACKEND_URL + "/clientlogout";

// Given a fetch response, check it for errors and throw
// reasonable exceptions if so.  Otherwise, return the response
// converted to JSON.
const checkJSON = (resp: Response, errOK: boolean = false) => {
  if (resp.status === 401 || resp.status === 403) throw new AuthError();
  if (!errOK && !resp.ok) throw Error("An error occurred");

  return resp
    .json()
    .then((data) => {
      if (data.errorType === "LambdaTimeoutError")
        throw new TimeoutError("Backend timeout");
      if (data.message === "Service Unavailable")
        throw new TimeoutError("Backend timeout (likely)");
      return data;
    })
    .catch((err) => {
      throw new Error(`An error occurred: ${err}`);
    });
};

export class MastoWorker extends WorkerBase {
  private token: string | null = null;
  private domain: string | null = null;
  private debug: number = 0;

  constructor() {
    super();
    this.debug = Date.now();
  }

  private instance() {
    if (!this.token) throw Error("API not ready");

    return login({
      url: `https://${this.domain}`,
      accessToken: this.token,
      disableVersionCheck: true,
    });
  }

  async ready(): Promise<boolean> {
    return this.token !== null;
  }

  async logout(): Promise<void> {
    const params = {
      token: this.token,
      domain: this.domain,
    };
    return fetch(urlLogout, {
      credentials: "include",
      method: "POST",
      body: JSON.stringify(params),
    }).then(() => {
      return;
    });
  }

  async login(user: string, pass: string) {
    throw Error("Not implemented");
  }

  // Returns a string with the authorize redirect
  async auth(domain: string): Promise<string> {
    const res: string = await fetch(`${urlAuth}?domain=${domain}`)
      .then((resp) => checkJSON(resp, true))
      .then((data) => {
        if (data.status === "bad_host") throw new BadHostError();
        if (data.status === "blocked") throw new BlockedHostError();
        if (data.status === "not_allowed") throw new NotAllowedError();
        return data;
      })
      .then((data) => data);
    return res;
  }

  // Given a code, completes the OAuth dance, storing a token for this
  // worker to use to access APIs.
  async callback(code: string, domain: string): Promise<void> {
    // If we already have a token, don't run the below.
    if (this.token) return;

    const self = this;
    await fetch(`${urlCallback}?code=${code}&domain=${domain}`, {
      credentials: "include",
      method: "POST",
    })
      .then((resp) => checkJSON(resp))
      .then((data) => {
        self.token = data.token;
        self.domain = domain;
      });
  }

  // Returns information about follows and lists
  // Returns an object of type APIData
  async info(callback: (value: number) => void): Promise<APIData> {
    if (!this.ready()) throw Error("API not ready");
    if (!this.token) throw Error("API not ready");
    if (!this.domain) throw Error("API not ready - no domain");

    const domain = this.domain;

    const self = this;
    return login({
      url: `https://${this.domain}`,
      accessToken: this.token,
      disableVersionCheck: true,
    }).then(async (masto) => {
      // Fetch our server version and store it.
      await masto.v1.instances.fetch().then((inst) => {
        self.server_version = inst.version;
      });
      return info_meta(masto, domain)
        .then((res) => ({
          me: res.me,
          lists: res.lists,
          users: [],
        }))
        .then(async (data: APIData) => {
          // Remember ourselves
          self.me = data.me;
          // Build a map to track duplicates
          const userMap: Record<string, User> = {};
          const totalwork =
            data.me.following_count +
            data.me.follower_count +
            data.lists.length;

          // First people that we are following
          let following: User[] = [];
          const followingcb = (num: number) =>
            callback((100 * num) / totalwork);
          await info_following(masto, data.me.id, domain, followingcb).then(
            (res) => {
              following = res;
              following.forEach((fol) => {
                userMap[fol.id] = fol;
              });
            }
          );
          // Now, those following us
          const followerscb = (num: number) =>
            callback((100 * (data.me.following_count + num)) / totalwork);
          await info_followers(masto, data.me.id, domain, followerscb).then(
            (res) => {
              res.forEach((acct) => {
                if (userMap[acct.id]) {
                  userMap[acct.id].follower = true;
                } else {
                  userMap[acct.id] = acct;
                }
              });
            }
          );
          // Now pull list memberships
          const listscb = (num: number) =>
            callback(
              (100 * (data.me.following_count + data.me.follower_count + num)) /
                totalwork
            );
          await info_lists(masto, listscb).then((res) => {
            data.lists.forEach((list) => {
              const userids = res[list.id];
              userids.forEach((userid) => {
                const fol = userMap[userid];
                if (fol) {
                  fol.lists.push(list.id);
                }
              });
            });
          });
          return {
            users: Object.values(userMap),
            lists: data.lists,
            me: data.me,
          };
        })
        .then((data) => data);
    });
  }

  // Creates a new list
  async createList(list_name: string): Promise<List> {
    return this.instance().then((masto) => list_create(masto, list_name));
  }

  // Deletes a list
  async deleteList(list_id: string): Promise<void> {
    return this.instance().then((masto) => list_delete(masto, list_id));
  }

  // Adds a user to a list
  async addToList(list_id: string, follower_id: string): Promise<void> {
    if (!this.ready()) throw Error("API not ready");
    if (!this.token) throw Error("API not ready");

    return this.instance().then((masto) =>
      list_add(masto, list_id, [follower_id])
    );
  }

  // Removes a user from a list
  async removeFromList(list_id: string, follower_id: string): Promise<void> {
    if (!this.ready()) throw Error("API not ready");
    if (!this.token) throw Error("API not ready");

    return this.instance().then((masto) =>
      list_remove(masto, list_id, [follower_id])
    );
  }

  // Creates a new list and imports data into it
  async importList(list_name: string, account_ids: string[]): Promise<void> {
    // TODO: We should allow importing into an existing list.
    return this.instance().then((masto) => {
      list_create(masto, list_name).then((list) => {
        list_add(masto, list.id, account_ids);
      });
    });
  }

  // Computes analytics for the given list
  async listAnalytics(list: List): Promise<ListAnalytics> {
    return this.instance().then((masto) => fetchAnalytics(masto, list));
  }

  // Follows an account
  async follow(userid: string): Promise<void> {
    return this.instance().then((masto) => follow(masto, userid));
  }

  // Unfollows an account
  async unfollow(userid: string): Promise<void> {
    return this.instance().then((masto) => unfollow(masto, userid));
  }

  async list_timeline(
    list_id: string,
    min_posts: number,
    max_posts: number,
    min_days: number
  ): Promise<Post[]> {
    return this.instance().then(async (masto) => {
      let statuses: Post[] = [];
      const now = new Date();
      for await (const batch of masto.v1.timelines.listList(list_id)) {
        if (batch.length === 0) break;

        const posts: Post[] = batch.map((st) => {
          // The author of the status.
          const u = account2User(st.account, false, false, this.domain);
          // The author of the original post, if this is a boost.
          const ru = st.reblog
            ? account2User(st.reblog.account, false, false, this.domain)
            : null;
          // FIXME: We are only a reply if we are replying to someone who isn't us.
          const is_reply =
            st.inReplyToId !== null && st.inReplyToAccountId !== st.account.id;
          // If this is a repost/boost, then make the author
          return {
            created_at: st.createdAt,
            author: u,
            is_reply: is_reply,
            is_repost: ru !== null,
            repost_author: ru,
          };
        });

        statuses = statuses.concat(posts);
        const earliest = new Date(posts[posts.length - 1].created_at);
        const diff = now.getTime() - earliest.getTime();
        const count = statuses.length;
        if (count > max_posts) break;
        if (count > min_posts && diff > min_days) break;
      }
      return statuses;
    });
  }

  // Follow a list of accounts by name (not ID)
  async follow_by_names(names: string[]): Promise<User[]> {
    return this.instance().then((masto) => follow_by_names(masto, names));
  }
}
