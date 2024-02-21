// Web Worker

import { User, List, Post, APIData, ListAnalytics } from "@mastodonlm/shared";
import * as Comlink from "comlink";

import { BlueskyWorker } from "./bluesky_worker";
import { MastoWorker } from "./mastodon_worker";

// Change the default number of stack frames
Error.stackTraceLimit = 30;

// Helper functions for listAnalytics()

// From a list of statuses, pull out a mapping of account id to
// a User object.
// Second parameter maps from a status to an account object or null.
// e.g. pass in ((st) => st.reblog.account) to get the boosted account.
function getAccountMap(statuses: Post[], accessor?: (s: Post) => User | null) {
  const getacc = accessor || ((s: Post) => s.author);

  const res: Record<string, User> = {};
  statuses.forEach((st) => {
    const acc = getacc(st);
    if (acc) res[acc.id] = acc;
  });

  return res;
}

interface CountAccounts {
  accessor?: (s: Post) => User | null;
  predicate?: (s: Post) => boolean;
}
// Given a list of statuses, compute counts of account IDs
// Second parameter maps from a status to an account object or null.
// e.g. pass in ((st) => st.reblog.account) to get the boosted account.
function countAccounts(
  statuses: Post[],
  {
    accessor = (s: Post) => s.author,
    predicate = (s: Post) => true,
  }: CountAccounts
) {
  const counts: Record<string, number> = {};

  statuses.forEach((st) => {
    const acc = accessor(st);
    if (predicate(st)) {
      if (acc) counts[acc.id] = (counts[acc.id] || 0) + 1;
    }
  });
  return counts;
}

// Given a mapping from string to a count, return the top num
// records, in descending order.
function topCounts(counts: Record<string, number>, num = 5) {
  const sortedKeys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  return sortedKeys.slice(0, 5);
}

// APIWorker that implements all functions by calling to an implementation
// class.  This implementaiton class would have WorkerBase as a baseclass.

export default class APIWorker {
  private impl: MastoWorker | BlueskyWorker | null = null;

  private makeimpl(service: string) {
    if (service === "mastodon") this.impl = new MastoWorker();
    if (service === "bluesky") this.impl = new BlueskyWorker();
  }

  async list_requires_follow(): Promise<boolean> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.list_requires_follow();
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

    // Parameters for our analytics.
    // We are going to try to pull posts spanning at least minDays
    // But, we'll never pull fewer than minPosts posts, and will pull
    // a maximum of maxPosts posts.
    const minDays = 7 * 1000 * 60 * 60 * 24;
    const minPosts = 100;
    const maxPosts = 500;

    console.log("HERE");

    const statuses = await this.impl.list_timeline(
      list.id,
      minPosts,
      maxPosts,
      minDays
    );

    // How many are replies to someone other than the author?
    const numRepliesToAnother = statuses.filter((x) => x.is_reply).length;

    // Who are the authors?
    const authors = getAccountMap(statuses);

    // Who are the top authors?
    const authorCounts = countAccounts(statuses, { predicate: (st) => true });
    const authorOrigCounts = countAccounts(statuses, {
      predicate: (st) => !st.is_repost && !st.is_reply,
    });
    const authorReblogCounts = countAccounts(statuses, {
      predicate: (st) => st.is_repost,
    });
    const authorReplyCounts = countAccounts(statuses, {
      predicate: (st) => st.is_reply,
    });
    const topAuthors = topCounts(authorCounts);

    // How many reblogs?
    const numReblogs = statuses.filter((x) => x.is_repost).length;

    // Who are we reblogging?
    const reblogs = statuses.filter((x) => x.is_repost);
    const getReblogAcc = (st: Post) => st.repost_author;
    const reblogAuthors = getAccountMap(reblogs, getReblogAcc);
    console.log(reblogAuthors);
    const reblogAuthorCounts = countAccounts(reblogs, {
      accessor: getReblogAcc,
    });
    const topReblogAuthors = topCounts(reblogAuthorCounts);

    // What is our timeline?
    const hours: Record<number, number> = {};
    statuses.forEach((st) => {
      const timez = new Date(st.created_at);
      // What's our local timezone
      const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locale = new Intl.NumberFormat().resolvedOptions().locale;
      const localeTimeStr = timez.toLocaleString(locale, {
        timeZone: localZone,
      });
      const localTime = new Date(localeTimeStr);
      localTime.setMilliseconds(0);
      localTime.setSeconds(0);
      localTime.setMinutes(0);
      hours[localTime.getTime()] = (hours[localTime.getTime()] || 0) + 1;
    });

    const res = {
      list_id: list.id,
      list_name: list.title,
      latest_post: new Date(statuses[0].created_at),
      earliest_post: new Date(statuses[statuses.length - 1].created_at),
      num_posts: statuses.length,
      num_orig_posts: statuses.length - numReblogs - numRepliesToAnother,
      num_boosts: numReblogs,
      num_replies: numRepliesToAnother,
      top_posters: topAuthors.map((x) => ({
        acct: authors[x],
        count_orig: authorOrigCounts[x] || 0,
        count_boost: authorReblogCounts[x] || 0,
        count_reply: authorReplyCounts[x] || 0,
      })),
      top_boosts: topReblogAuthors.map((x) => ({
        acct: reblogAuthors[x],
        count: reblogAuthorCounts[x] || 0,
      })),
    };
    return res;
  }

  // Follows an account
  async follow(userid: string | string[]): Promise<void> {
    if (!this.impl) throw Error("API not ready");

    if (userid instanceof Array) return this.impl.follow(userid);
    return this.impl.follow([userid]);
  }

  // Follows an account
  async unfollow(userid: string): Promise<void> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.unfollow(userid);
  }

  // Lookup a list of users by account name.
  async lookup(names: string[]): Promise<User[]> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.lookup(names);
  }

  // Pulls the timeline for a list
  // Returns at least min_posts and at most max_posts entries,
  // trying to cover at least min_days days worth of posts.
  async list_timeline(
    list_id: string,
    min_posts: number,
    max_posts: number,
    min_days: number
  ): Promise<Post[]> {
    if (!this.impl) throw Error("API not ready");
    return this.impl.list_timeline(list_id, min_posts, max_posts, min_days);
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
