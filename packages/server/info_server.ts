// Info operations backend server

import {
  info_meta,
  info_following,
  info_followers,
  info_lists,
} from "@mastodonlm/shared";
import { Handler } from "aws-lambda";
import { gen_handler } from "./utils";
import type { mastodon } from "masto";

// Convenient type aliases
type Client = mastodon.Client;

export const info_meta_handler: Handler = async (event, context) => {
  const method = (masto: Client, domain: string) => info_meta(masto, domain);
  return gen_handler(event, context, method);
};

export const info_following_handler: Handler = async (event, context) => {
  const method = (masto: Client, domain: string) => {
    return info_following(masto, null, domain, null).then((res) => ({
      following: res,
    }));
  };

  return gen_handler(event, context, method);
};

export const info_followers_handler: Handler = async (event, context) => {
  const method = (masto: Client, domain: string) => {
    return info_followers(masto, null, domain, null).then((res) => ({
      followers: res,
    }));
  };

  return gen_handler(event, context, method);
};

export const info_lists_handler: Handler = async (event, context) => {
  const method = (masto: Client, domain: string) =>
    info_lists(masto, null).then((res) => ({ lists: res }));
  return gen_handler(event, context, method);
};
