// Analytics TS backend driver

import { fetchAnalytics } from "@mastodonlm/shared";
import { Handler } from "aws-lambda";
import { gen_handler } from "./utils";
import type { mastodon } from "masto";

// Convenient type aliases
type Client = mastodon.Client;

export const analytics: Handler = async (event, context) => {
  const list = { id: event.queryStringParameters?.list_id, title: "" };
  const method = (masto: Client, domain: string) => fetchAnalytics(masto, list);
  return gen_handler(event, context, method);
};
