import type { mastodon } from "masto";
import { List, ListAnalytics, User } from "./types";

// Convenient type aliases
type Status = mastodon.v1.Status;
type Account = mastodon.v1.Account;
type Client = mastodon.Client;

// Convert a masto.Account object to a User object
function makeUser(acct: Account): User {
  return {
    id: acct.id,
    display_name: acct.displayName,
    username: acct.username,
    avatar: acct.avatar,
    acct: acct.acct,
    note: acct.note,
    lists: [],
    following_count: acct.followingCount,
    follower_count: acct.followersCount,
    following: false,
    follower: false,
    suspended: false,
    limited: false,
    moved: undefined,
  };
}

// From a list of statuses, pull out a mapping of account id to
// a User object.
// Second parameter maps from a status to an account object or null.
// e.g. pass in ((st) => st.reblog.account) to get the boosted account.
function getAccountMap(
  statuses: Status[],
  accessor?: (s: Status) => Account | null
) {
  const getacc = accessor || ((s: Status) => s.account);

  const res: Record<string, Account> = {};
  statuses.forEach((st) => {
    const acc = getacc(st);
    if (acc) res[acc.id] = acc;
  });

  return res;
}

interface CountAccounts {
  accessor?: (s: Status) => Account | null;
  predicate?: (s: Status) => boolean;
}
// Given a list of statuses, compute counts of account IDs
// Second parameter maps from a status to an account object or null.
// e.g. pass in ((st) => st.reblog.account) to get the boosted account.
function countAccounts(
  statuses: Status[],
  {
    accessor = (s: Status) => s.account,
    predicate = (s: Status) => true,
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

// Fetch list analytics
//
export async function fetchAnalytics(
  masto: Client,
  list: List
): Promise<ListAnalytics> {
  // Parameters for our analytics.
  // We are going to try to pull posts spanning at least minDays
  // But, we'll never pull fewer than minPosts posts, and will pull
  // a maximum of maxPosts posts.
  const minDays = 7 * 1000 * 60 * 60 * 24;
  const minPosts = 100;
  const maxPosts = 500;

  let statuses: Status[] = [];
  const now = new Date();
  for await (const st of masto.v1.timelines.listList(list.id)) {
    if (st.length === 0) break;

    statuses = statuses.concat(st);
    const earliest = new Date(st[st.length - 1].createdAt);
    const diff = now.getTime() - earliest.getTime();
    const count = statuses.length;
    if (count > maxPosts) break;
    if (count > minPosts && diff > minDays) break;
  }

  // How many are replies to someone other than the author?
  const numRepliesToAnother = statuses.filter(
    (x) => x.inReplyToId !== null && x.inReplyToAccountId !== x.account.id
  ).length;

  // Who are the authors?
  const authors = getAccountMap(statuses);

  // Who are the top authors?
  const authorCounts = countAccounts(statuses, {
    predicate: (st) => st.reblog == null,
  });
  const authorReblogCounts = countAccounts(statuses, {
    predicate: (st) => st.reblog !== null,
  });
  const topAuthors = topCounts(authorCounts);

  // How many reblogs?
  const numReblogs = statuses.filter((x) => x.reblog !== null).length;

  // Who are we reblogging?
  const reblogs = statuses.filter((x) => x.reblog);
  const getReblogAcc = (st: Status) => (st.reblog ? st.reblog.account : null);
  const reblogAuthors = getAccountMap(reblogs, getReblogAcc);
  const reblogAuthorCounts = countAccounts(reblogs, { accessor: getReblogAcc });
  const topReblogAuthors = topCounts(reblogAuthorCounts);

  // What is our timeline?
  const hours: Record<number, number> = {};
  statuses.forEach((st) => {
    const timez = new Date(st.createdAt);
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
    latest_post: new Date(statuses[0].createdAt),
    earliest_post: new Date(statuses[statuses.length - 1].createdAt),
    num_posts: statuses.length,
    num_orig_posts: statuses.length - numReblogs,
    num_boosts: numReblogs,
    num_replies: numRepliesToAnother,
    top_posters: topAuthors.map((x) => ({
      acct: makeUser(authors[x]),
      count_orig: authorCounts[x] || 0,
      count_boost: authorReblogCounts[x] || 0,
    })),
    top_boosts: topReblogAuthors.map((x) => ({
      acct: makeUser(reblogAuthors[x]),
      count: reblogAuthorCounts[x] || 0,
    })),
  };
  return res;
}
