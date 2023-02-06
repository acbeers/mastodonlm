// Web Worker

import { User, List, APIData, TimeoutError, AuthError } from "./types";
import * as Comlink from "comlink";
import { login } from "masto";
import { WorkerBase } from "./workerbase";

// Endpoints
const urlAuth = process.env.REACT_APP_BACKEND_URL + "/auth";
const urlCallback = process.env.REACT_APP_BACKEND_URL + "/clientcallback";
const urlLogout = process.env.REACT_APP_BACKEND_URL + "/clientlogout";

async function asyncForEach(
  array: any[],
  callback: (a: any, n: number, x: any[]) => void
) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

// Given a fetch response, check it for errors and throw
// reasonable exceptions if so.  Otherwise, return the response
// converted to JSON.
const checkJSON = (resp: Response) => {
  if (resp.status === 401 || resp.status === 403) throw new AuthError();
  if (!resp.ok) throw Error("An error occurred");

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

export default class APIWorker extends WorkerBase {
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

  // Returns a string with the authorize redirect
  async auth(domain: string): Promise<string> {
    const res: string = await fetch(`${urlAuth}?domain=${domain}`)
      .then((resp) => checkJSON(resp))
      .then((data) => data.url);
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

    const self = this;
    return login({
      url: `https://${this.domain}`,
      accessToken: this.token,
    }).then((masto) => {
      return masto.v1.accounts
        .verifyCredentials()
        .then((me) => {
          const meuser = {
            id: me.id,
            display_name: me.displayName,
            username: me.username,
            avatar: me.avatar,
            acct: me.acct + "@" + self.domain,
            note: me.note,
            lists: [],
            following_count: me.followingCount,
          };
          self.me = meuser;
          return {
            followers: [],
            lists: [],
            me: meuser,
          };
        })
        .then(async (data: APIData) => {
          let res: List[] = [];
          for await (const lists of masto.v1.lists.list()) {
            const batch: List[] = lists.map((list) => ({
              id: list.id,
              title: list.title,
            }));
            res = res.concat(batch);
          }
          return { followers: data.followers, lists: res, me: data.me };
        })
        .then(async (data: APIData) => {
          let res: User[] = [];
          for await (const users of masto.v1.accounts.listFollowing(
            data.me.id
          )) {
            const batch: User[] = users.map((user) => ({
              id: user.id,
              display_name: user.displayName,
              username: user.username,
              avatar: user.avatar,
              acct: user.acct,
              note: user.note,
              following_count: 0,
              lists: [],
            }));
            res = res.concat(batch);
            callback(
              (100 * res.length) / (data.me.following_count + data.lists.length)
            );
          }
          // Build a map
          const followerMap: Record<string, User> = {};
          res.forEach((u) => {
            followerMap[u.id] = u;
          });
          // Now pull list memberships
          await asyncForEach(data.lists, async (list, idx) => {
            for await (const users of masto.v1.lists.listAccounts(list.id)) {
              users.forEach((user) => {
                const fol = followerMap[user.id];
                if (fol) {
                  fol.lists.push(list.id);
                }
              });
              callback(
                (100 * (data.me.following_count + idx)) /
                  (data.me.following_count + data.lists.length)
              );
            }
          });
          return { followers: res, lists: data.lists, me: data.me };
        })
        .then((data) => data);
    });
  }

  // Creates a new list
  async createList(list_name: string): Promise<void> {
    return this.instance().then((masto) => {
      masto.v1.lists.create({ title: list_name });
    });
  }

  // Deletes a list
  async deleteList(list_id: string): Promise<void> {
    return this.instance().then((masto) => {
      masto.v1.lists.remove(list_id);
    });
  }

  // Adds a user to a list
  async addToList(list_id: string, follower_id: string): Promise<void> {
    if (!this.ready()) throw Error("API not ready");
    if (!this.token) throw Error("API not ready");

    return login({
      url: `https://${this.domain}`,
      accessToken: this.token,
    }).then((masto) => {
      return masto.v1.lists
        .addAccount(list_id, { accountIds: [follower_id] })
        .then(() => console.log("added"));
    });
  }

  // Removes a user from a list
  async removeFromList(list_id: string, follower_id: string): Promise<void> {
    if (!this.ready()) throw Error("API not ready");
    if (!this.token) throw Error("API not ready");

    return login({
      url: `https://${this.domain}`,
      accessToken: this.token,
    }).then((masto) => {
      return masto.v1.lists
        .removeAccount(list_id, { accountIds: [follower_id] })
        .then(() => console.log("removed"));
    });
  }
}
Comlink.expose(APIWorker);
