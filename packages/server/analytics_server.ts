// Analytics TS backend driver
//import type { mastodon } from "masto";
import { fetchAnalytics } from "@mastodonlm/shared";
import { Handler } from "aws-lambda";
import { Factory } from "./factory";

export const analytics: Handler = async (event, context) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return { statusCode: 401, body: "" };

    // FIXME: figure out how to get query string parameters here.
    const list = { id: event.queryStringParameters?.list_id, title: "" };
    return fetchAnalytics(masto, list).then((res) => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(res),
      };

      return response;
    });
  });
};
