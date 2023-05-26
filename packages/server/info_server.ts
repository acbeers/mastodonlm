// Info operations backend server

import {
  info_meta,
  info_following,
  info_followers,
  info_lists,
} from "@mastodonlm/shared";
import { Handler, APIGatewayEvent, Context } from "aws-lambda";
import { Factory } from "./factory";
import { Datastore } from "./datastore";
import { ok_response, err_response, auth_response } from "./utils";
import type { mastodon } from "masto";

// Convenient type aliases
type Client = mastodon.Client;

// A 'general' handler, which will get a mastodon object, then call
// a caller-provided method which will return an object, which will
// then be serialized to output.  Errors will be caught and turned
// into API-friendly responses.
//
const gen_handler = async (
  event: APIGatewayEvent,
  context: Context,
  method: (masto: Client, domain: string) => Promise<object>
) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return auth_response();

    return Datastore.getAuth(cookie).then((auth) => {
      const domain = auth.domain;
      method(masto, domain).catch((err) => {
        console.log(err);
      });

      // FIXME: ok_response assumes that the response is an object.  info_following()
      // returns a list, which gets pretty shredded by ok_response.
      // Either accept this and fix ok_response, or standardize my responses to always be
      // an object e.g. {status:OK, followers:[]}
      return method(masto, domain)
        .then((info) => ok_response(info))
        .catch((err) => err_response("meta failed"));
    });
  });
};

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
