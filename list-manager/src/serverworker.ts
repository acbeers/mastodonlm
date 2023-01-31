// API methods for List Manager

import { User, List, APIData, TimeoutError, AuthError } from "./types";
import * as Comlink from "comlink";

// Our endpoints
const urlFollowing = process.env.REACT_APP_BACKEND_URL + "/following";
const urlMeta = process.env.REACT_APP_BACKEND_URL + "/meta";
const urlLists = process.env.REACT_APP_BACKEND_URL + "/lists";
const urlAdd = process.env.REACT_APP_BACKEND_URL + "/add";
const urlRemove = process.env.REACT_APP_BACKEND_URL + "/remove";
const urlCreate = process.env.REACT_APP_BACKEND_URL + "/create";
const urlDelete = process.env.REACT_APP_BACKEND_URL + "/delete";
const urlAuth = process.env.REACT_APP_BACKEND_URL + "/auth";
const urlCallback = process.env.REACT_APP_BACKEND_URL + "/callback";
const urlLogout = process.env.REACT_APP_BACKEND_URL + "/logout";

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
export default class ServerAPIWorker {
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
        console.log(data);
        self.cookie = data.auth;
      });
  }

  async logout(): Promise<void> {
    this.authPOST(urlLogout).then((resp) => checkJSON(resp));
  }

  // Returns information about follows and lists
  // Returns an object of type APIData
  async info(callback: (value: number) => void): Promise<APIData> {
    return this.authGET(urlMeta)
      .then((resp) => checkJSON(resp))
      .then((meta) => {
        // If this isn't the right kind nof response, just bail.
        // e.g. this may be a status: response that will kick off authentication.
        if (!meta.me) return meta;

        let following: User[] = [];
        let lists = meta.lists;
        const total = 3;

        // Get followers
        // Get lists
        // Build per-follower list membership

        return this.authGET(urlFollowing)
          .then((resp) => checkJSON(resp))
          .then((x) => {
            following = x;
            callback(100 / total);
          })
          .then(() => this.authGET(urlLists))
          .then((resp) => checkJSON(resp))
          .then((listaccts) => {
            callback(200 / total);
            // Build up lists for each follower
            following.forEach((x) => (x.lists = []));
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
              followers: following,
              lists: lists,
              me: meta.me,
            };
          });
      });
  }

  // Creates a new list
  async createList(list_name: string): Promise<void> {
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
}

Comlink.expose(ServerAPIWorker);
