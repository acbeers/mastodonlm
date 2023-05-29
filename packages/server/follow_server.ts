// Follow / unfollow backend server

import { follow, unfollow } from "@mastodonlm/shared";
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
