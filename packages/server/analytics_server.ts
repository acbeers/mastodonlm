// Analytics TS backend driver

import { fetchAnalytics } from "@mastodonlm/shared";
import { Handler } from "aws-lambda";
import { Factory } from "./factory";
import { ok_response, err_response, auth_response } from "./utils";

export const analytics: Handler = async (event, context) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return auth_response();

    const list = { id: event.queryStringParameters?.list_id, title: "" };
    return fetchAnalytics(masto, list)
      .then((res) => ok_response(res))
      .catch((err) => err_response("analytics failed"));
  });
};
