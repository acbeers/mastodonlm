import { Handler, APIGatewayEvent, Context } from "aws-lambda";
import type { mastodon } from "masto";
import { Factory } from "./factory";
import { Datastore } from "./datastore";

// Convenient type aliases
type Client = mastodon.Client;

// Returns a OK response - a "status" key with a value
// of "OK" will be injected into the provided object
// and returned as an AWS lambda response.
//
export function ok_response(obj: object) {
  const body = { ...obj, status: "OK" };
  const response = {
    statusCode: 200,
    body: JSON.stringify(body),
  };

  return response;
}

// Returns an error response with the provided message
// as a "status" key in an object.
export function err_response(msg: string, obj = {}) {
  const body = { ...obj, status: msg };
  const response = {
    statusCode: 500,
    body: JSON.stringify(body),
  };

  return response;
}

// More specific errors
export const badhost_response = (host: string) =>
  err_response("bad_host", { host });
export const blocked_response = (host: string) =>
  err_response("blocked", { host });

// Returns a HTTP status 401 AWS lambda response.
export function auth_response() {
  return { statusCode: 401, body: "" };
}

// A 'general' handler, which will get a mastodon object, then call
// a caller-provided method which will return an object, which will
// then be serialized to output.  Errors will be caught and turned
// into API-friendly responses.
//
export const gen_handler = async (
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

export function auth_request_url(
  base_url: string,
  client_id: string,
  redirect_uris: string = "urn:ietf:wg:oauth:2.0:oob",
  scopes: string[] = ["read"],
  force_login: boolean = false,
  state = null,
  lang = null
) {
  const params = {
    client_id: client_id,
    response_type: "code",
    redirect_uri: redirect_uris,
    scope: scopes.join(" "),
    force_login: force_login,
    state: state,
    lang: lang,
  };

  const formatted_params = Object.keys(params).map(
    (param) => `${param}=${encodeURIComponent(params[param])}`
  );
  return `${base_url}/oauth/authorize?${formatted_params.join("&")}`;
}
