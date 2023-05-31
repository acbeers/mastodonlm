// List operations backend server

import {
  list_create,
  list_delete,
  list_add,
  list_remove,
  list_import,
} from "@mastodonlm/shared";
import { Handler } from "aws-lambda";
import { Factory } from "./factory";
import { ok_response, err_response, auth_response, gen_handler } from "./utils";
import type { mastodon } from "masto";

// Convenient type aliases
type Client = mastodon.Client;

export const list_create_handler: Handler = async (event, context) => {
  const list_name = event.queryStringParameters?.list_name;

  const method = (masto: Client, domain: string) =>
    list_create(masto, list_name);
  return gen_handler(event, context, method);
};

export const list_delete_handler: Handler = async (event, context) => {
  const list_id = event.queryStringParameters?.list_id;

  const method = (masto: Client, domain: string) =>
    list_delete(masto, list_id).then(() => ({}));
  return gen_handler(event, context, method);
};

export const list_add_handler: Handler = async (event, context) => {
  const list_id = event.queryStringParameters?.list_id;
  const accountids = event.queryStringParameters?.account_id.split(",");

  const method = (masto: Client, domain: string) =>
    list_add(masto, list_id, accountids).then(() => ({}));
  return gen_handler(event, context, method);
};

export const list_remove_handler: Handler = async (event, context) => {
  const list_id = event.queryStringParameters?.list_id;
  const accountids = event.queryStringParameters?.account_id.split(",");

  const method = (masto: Client, domain: string) =>
    list_remove(masto, list_id, accountids).then(() => ({}));
  return gen_handler(event, context, method);
};

export const list_import_handler: Handler = async (event, context) => {
  const list_name = event.queryStringParameters?.list_name;
  const accountids = event.queryStringParameters?.accts.split(",");

  const method = (masto: Client, domain: string) =>
    list_import(masto, list_name, accountids).then(() => ({}));
  return gen_handler(event, context, method);
};
