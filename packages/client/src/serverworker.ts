// API methods for List Manager

import {
  User,
  List,
  APIData,
  ListAnalytics,
  TimeoutError,
  AuthError,
} from "@mastodonlm/shared";
import * as Comlink from "comlink";
import { WorkerBase } from "./workerbase";

// Our endpoints
const urlFollowing = process.env.REACT_APP_BACKEND_URL + "/following";
const urlFollowers = process.env.REACT_APP_BACKEND_URL + "/followers";
const urlMeta = process.env.REACT_APP_BACKEND_URL + "/meta";
const urlLists = process.env.REACT_APP_BACKEND_URL + "/lists";
const urlAdd = process.env.REACT_APP_BACKEND_URL + "/add";
const urlRemove = process.env.REACT_APP_BACKEND_URL + "/remove";
const urlCreate = process.env.REACT_APP_BACKEND_URL + "/create";
const urlDelete = process.env.REACT_APP_BACKEND_URL + "/delete";
const urlAuth = process.env.REACT_APP_BACKEND_URL + "/auth";
const urlCallback = process.env.REACT_APP_BACKEND_URL + "/callback";
const urlLogout = process.env.REACT_APP_BACKEND_URL + "/logout";
const urlAnalytics = process.env.REACT_APP_BACKEND_URL + "/analytics";
const urlFollow = process.env.REACT_APP_BACKEND_URL + "/follow";
const urlUnfollow = process.env.REACT_APP_BACKEND_URL + "/unfollow";
const urlFollowByNames = process.env.REACT_APP_BACKEND_URL + "/follow_by_names";

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

// A server API that matches the client API in behavior.
// This also runs in a Worker via Comlink.
// NOTE: This may not be a great pattern, since the Server API should
// more transparently deal with cookies.  But if I just make it an async
// API then the user of it needs to know, since it won't be accessible via comlink.
// I could make Comlink proxy to something that is in this thread, though.
//
export default class ServerAPIWorker extends WorkerBase {
  private cookie: string = "";

  // A version of fetch that passes our authentication
  private authenticatedFetch(url: string, options: RequestInit) {
    const requestHeaders: HeadersInit = new Headers();
    const val = this.cookie;
    if (val) requestHeaders.set("authorization", val);

    return fetch(url, {
      credentials: "include",
      method: options.method || "GET",
      headers: requestHeaders,
    });
  }

  private authGET(url: string) {
    return this.authenticatedFetch(url, { method: "GET" });
  }

  private authPOST(url: string) {
    return this.authenticatedFetch(url, { method: "POST" });
  }

  async ready(): Promise<boolean> {
    return this.cookie !== null;
  }

  // Returns a string with the authorize redirect
  async auth(domain: string): Promise<string> {
    return this.authGET(urlAuth)
      .then((resp) => checkJSON(resp))
      .then((data) => data.url);
  }

  // Redeem an oauth code for a token.
  async callback(code: string, domain: string): Promise<void> {
    const self = this;
    await fetch(`${urlCallback}?code=${code}&domain=${domain}`, {
      credentials: "include",
      method: "POST",
      body: JSON.stringify({ code: code, domain: domain }),
    })
      .then((resp) => checkJSON(resp))
      .then((data) => {
        self.cookie = data.auth;
      });
  }

  async logout(): Promise<void> {
    this.authPOST(urlLogout).then((resp) => checkJSON(resp));
  }

  // Returns information about follows and lists
  // Returns an object of type APIData
  async info(callback: (value: number) => void): Promise<APIData> {
    const self = this;
    return this.authGET(urlMeta)
      .then((resp) => checkJSON(resp))
      .then((meta) => {
        // If this isn't the right kind nof response, just bail.
        // e.g. this may be a status: response that will kick off authentication.
        if (!meta.me) return meta;

        let following: User[] = [];
        let lists = meta.lists;
        const total = 3;

        self.me = meta.me;

        // Get followers
        // Get lists
        // Build per-follower list membership

        return this.authGET(urlFollowing)
          .then((resp) => checkJSON(resp))
          .then((x) => {
            following = x.following;
            following.forEach((x) => {
              x.following = true;
              x.follower = false;
            });
            callback(100 / total);
          })
          .then(() => this.authGET(urlFollowers))
          .then((resp) => checkJSON(resp))
          .then((followers) => {
            // Update
            const followingMap: Record<string, User> = {};
            following.forEach((fol) => {
              followingMap[fol.id] = fol;
            });
            followers.followers.forEach((fol: User) => {
              fol.follower = true;
              fol.following = false;
              if (fol.id in followingMap) {
                followingMap[fol.id].follower = true;
              } else following.push(fol);
            });
            callback(100 / total);
          })
          .then(() => this.authGET(urlLists))
          .then((resp) => checkJSON(resp))
          .then((resp) => {
            const listaccts = resp.lists;
            callback(200 / total);
            // Build up lists for each follower
            following.forEach((x) => {
              x.lists = [];
            });
            // A map for easy lookup
            const followerMap: Record<string, User> = {};
            following.forEach((x) => (followerMap[x.id] = x));
            // And, for each list
            lists.forEach((list: List, index: number) => {
              const accts = listaccts[list.id];
              accts.forEach((acct: number) => {
                const fol = followerMap[acct];
                if (fol) fol.lists.push(list.id);
              });
            });
            return {
              users: following,
              lists: lists,
              me: meta.me,
            };
          });
      });
  }

  // Creates a new list
  async createList(list_name: string): Promise<List> {
    return this.authPOST(`${urlCreate}?list_name=${list_name}`).then((resp) =>
      checkJSON(resp)
    );
  }

  // Deletes a list
  async deleteList(list_id: string): Promise<void> {
    return this.authPOST(`${urlDelete}?list_id=${list_id}`).then((resp) =>
      checkJSON(resp)
    );
  }

  // Adds a user to a list
  async addToList(list_id: string, follower_id: string): Promise<void> {
    return this.authPOST(
      `${urlAdd}?list_id=${list_id}&account_id=${follower_id}`
    ).then((resp) => checkJSON(resp));
  }

  // Removes a user from a list
  async removeFromList(list_id: string, follower_id: string): Promise<void> {
    return this.authPOST(
      `${urlRemove}?list_id=${list_id}&account_id=${follower_id}`
    ).then((resp) => checkJSON(resp));
  }

  // Creates a new list and imports data into it
  async importList(list_name: string, accounts: string[]): Promise<void> {
    return this.authPOST(`${urlCreate}?list_name=${list_name}`)
      .then((resp) => checkJSON(resp))
      .then((list) => {
        return this.authPOST(
          `${urlAdd}?list_id=${list.id}&account_id=${accounts.join(",")}`
        );
      })
      .then((resp) => checkJSON(resp));
  }

  // Computes analytics for the given list
  async listAnalytics(list: List): Promise<ListAnalytics> {
    return this.authGET(`${urlAnalytics}?list_id=${list.id}`)
      .then((resp) => checkJSON(resp))
      .then((data) => {
        // Data is just a JSON object.  Fix some points
        const la = {
          ...data,
          latest_post: new Date(data.latest_post),
          earliest_post: new Date(data.earliest_post),
        };
        return la;
      });
  }

  // Follows an account
  async follow(userid: string): Promise<void> {
    return this.authPOST(`${urlFollow}?user_id=${userid}`).then((resp) =>
      checkJSON(resp)
    );
  }

  // Follows an account
  async unfollow(userid: string): Promise<void> {
    return this.authPOST(`${urlUnfollow}?user_id=${userid}`).then((resp) =>
      checkJSON(resp)
    );
  }

  // Follow a list of accounts by name (not ID)
  async follow_by_names(names: string[]): Promise<User[]> {
    // FIXME: This is not returning the an array of User
    return this.authPOST(`${urlFollowByNames}?names=${names.join(",")}`)
      .then((resp) => checkJSON(resp))
      .then((data) => data.users);
  }
}

Comlink.expose(ServerAPIWorker);
