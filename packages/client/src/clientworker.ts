// Web Worker

import { User, List, APIData, ListAnalytics } from "@mastodonlm/shared";
import * as Comlink from "comlink";

import { BlueskyWorker } from "./bluesky_worker";
import { MastoWorker } from "./mastodon_worker";

// Change the default number of stack frames
Error.stackTraceLimit = 30;

// Create a new APIWorker that implements all functions by calling
// to an implementation class.  This implementaiton class would have
// WorkerBase as a baseclass.

export default class APIWorker {
  private impl: MastoWorker | BlueskyWorker | null = null;

  private makeimpl(service: string) {
    if (service === "mastodon") this.impl = new MastoWorker();
    if (service === "bluesky") this.impl = new BlueskyWorker();
  }

  // Returns a string with the authorize redirect
  async auth(service: string, domain: string): Promise<string> {
    this.makeimpl(service);
    if (!this.impl) throw Error("API not ready");
    return this.impl.auth(domain);
  }

  // Logs in or throws error
  async login(service: string, user: string, pass: string) {
    this.makeimpl(service);
    if (!this.impl) throw Error("API not ready");
    return this.impl.login(user, pass);
  }

  async ready(): Promise<boolean> {
    return this.impl !== null && this.impl.ready();
  }

  async logout(): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.logout();
  }

  // Given a code, completes the OAuth dance, storing a token for this
  // worker to use to access APIs.
  async callback(code: string, domain: string): Promise<void> {
    // Right now, we know only Mastodon has implemented oAuth
    // When bluesky implements it, we'll have to have multiple callback paths.
    this.makeimpl("mastodon");
    if (!this.impl) throw Error("API not ready");
    return this.impl.callback(code, domain);
  }

  // Returns information about follows and lists
  // Returns an object of type APIData
  async info(callback: (value: number) => void): Promise<APIData> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.info(callback);
  }

  // Creates a new list
  async createList(list_name: string): Promise<List> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.createList(list_name);
  }

  // Deletes a list
  async deleteList(list_id: string): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.deleteList(list_id);
  }

  // Adds a user to a list
  async addToList(list_id: string, follower_id: string): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.addToList(list_id, follower_id);
  }

  // Removes a user from a list
  async removeFromList(list_id: string, follower_id: string): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.removeFromList(list_id, follower_id);
  }

  // Creates a new list and imports data into it
  async importList(list_name: string, account_ids: string[]): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.importList(list_name, account_ids);
  }

  // Computes analytics for the given list
  async listAnalytics(list: List): Promise<ListAnalytics> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.listAnalytics(list);
  }

  // Follows an account
  async follow(userid: string): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.follow(userid);
  }

  // Follows an account
  async unfollow(userid: string): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.unfollow(userid);
  }

  // Follow a list of accounts by name (not ID)
  async follow_by_names(names: string[]): Promise<User[]> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.follow_by_names(names);
  }

  // Logs a telemetry event
  async telemetry(info: Record<string, any>): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.telemetry(info);
  }

  // Logs a telemetry event
  async error(info: Record<string, any>): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.error(info);
  }
}
Comlink.expose(APIWorker);
