// Follow / unfollow backend server

import { follow, unfollow } from "@mastodonlm/shared";
import { Handler } from "aws-lambda";
import { Factory } from "./factory";
import { ok_response, err_response, auth_response } from "./utils";

export const follow_handler: Handler = async (event, context) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return auth_response();

    const userid = event.queryStringParameters?.user_id;
    return follow(masto, userid)
      .then((res) => ok_response("OK"))
      .catch((err) => err_response("Follow failed"));
  });
};

export const unfollow_handler: Handler = async (event, context) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return auth_response();

    const userid = event.queryStringParameters?.user_id;
    return unfollow(masto, userid)
      .then((res) => ok_response("OK"))
      .catch((err) => err_response("Follow failed"));
  });
};
