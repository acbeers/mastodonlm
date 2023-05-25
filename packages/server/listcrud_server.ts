// List operations backend server

import {
  list_create,
  list_delete,
  list_add,
  list_remove,
} from "@mastodonlm/shared";
import { Handler } from "aws-lambda";
import { Factory } from "./factory";
import { ok_response, err_response, auth_response } from "./utils";

export const list_create_handler: Handler = async (event, context) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return auth_response();

    const list_name = event.queryStringParameters?.list_name;
    return (
      list_create(masto, list_name)
        // FIXME: ok_response() isn't really doing the right thing here.
        // I need to return {status:OK, list:list}
        .then((res) => ok_response({ list: res }))
        .catch((err) => err_response("List creation failed"))
    );
  });
};

export const list_delete_handler: Handler = async (event, context) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return auth_response();

    const list_id = event.queryStringParameters?.list_id;
    return list_delete(masto, list_id)
      .then((res) => ok_response({}))
      .catch((err) => err_response("List deletion failed"));
  });
};

export const list_add_handler: Handler = async (event, context) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return auth_response();

    const list_id = event.queryStringParameters?.list_id;
    const accountids = event.queryStringParameters?.account_id.split(",");
    return list_add(masto, list_id, accountids)
      .then((res) => ok_response({}))
      .catch((err) => err_response("List deletion failed"));
  });
};

export const list_remove_handler: Handler = async (event, context) => {
  const headers = event.headers || {};
  const cookie = headers.authorization || "";

  return Factory.fromCookie(cookie).then((masto) => {
    if (!masto) return auth_response();

    const list_id = event.queryStringParameters?.list_id;
    const accountids = event.queryStringParameters?.account_id.split(",");
    return list_remove(masto, list_id, accountids)
      .then((res) => ok_response({}))
      .catch((err) => err_response("List deletion failed"));
  });
};
