// Follow / unfollow backend server

import { follow, unfollow, follow_by_names } from "@mastodonlm/shared";
import { Handler } from "aws-lambda";
import { gen_handler } from "./utils";
import type { mastodon } from "masto";

// Convenient type aliases
type Client = mastodon.Client;

export const follow_handler: Handler = async (event, context) => {
  const userid = event.queryStringParameters?.user_id;
  const method = (masto: Client, domain: string) =>
    follow(masto, userid).then(() => ({}));
  return gen_handler(event, context, method);
};

export const unfollow_handler: Handler = async (event, context) => {
  const userid = event.queryStringParameters?.user_id;
  const method = (masto: Client, domain: string) =>
    unfollow(masto, userid).then(() => ({}));
  return gen_handler(event, context, method);
};

export const follow_by_names_handler: Handler = async (event, context) => {
  const namesStr = event.queryStringParameters?.names || "";
  const names = namesStr.split(",");
  const method = (masto: Client, domain: string) =>
    follow_by_names(masto, names).then((res) => {
      return { users: res };
    });
  return gen_handler(event, context, method);
};
