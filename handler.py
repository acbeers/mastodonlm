"""Handler for list manager functions"""

import datetime
import json
import logging
import time
import uuid

from mastodon import (
    Mastodon,
    MastodonAPIError,
    MastodonNotFoundError,
    MastodonIllegalArgumentError,
    MastodonInternalServerError,
    MastodonUnauthorizedError,
    MastodonNetworkError,
)
import requests

from models import Datastore

# Our User Agent
USER_AGENT = "mastodonlistmanager"


class NoAuthInfo(Exception):
    """Internal exception class for when we don't have auth info"""


class NotMastodon(Exception):
    """Internal exception for when we think we don't have a Mastodon connection"""


# AWS doens't set a logging level, so set it here.
logging.getLogger("root").setLevel(logging.INFO)
# But don't log much from botocore
logging.getLogger("botocore").setLevel(logging.ERROR)


class MastodonFactory:
    """Factory class for Mastodon instances"""

    @classmethod
    def from_cookie(cls, cookie):
        """Construct a mastodon object from the cookie"""
        authinfo = Datastore.get_auth(cookie)
        if authinfo is None:
            raise NoAuthInfo

        # Get the configuration that we need
        cfg = Datastore.get_host_config(authinfo.domain)
        if cfg is None:
            raise NoAuthInfo

        return MastodonFactory.from_config(cfg, token=authinfo.token)

    @classmethod
    def from_config(cls, cfg, token=None):
        """Create a Mastodon interface from a HostConfig object"""
        mastodon = Mastodon(
            client_id=cfg.client_id,
            client_secret=cfg.client_secret,
            access_token=token,
            user_agent=USER_AGENT,
            api_base_url=f"https://{cfg.host}",
        )
        # If the version check failed, then most likely this is an unusable
        # instance.  This can happen when e.g. we are blocked by CloudFlare
        if not mastodon.version_check_worked:
            raise NotMastodon

        return mastodon


def parse_cookies(cookies):
    """Do a simple parse of a list of cookies, turning it into a name:value dict"""
    res = {}
    for cookie in cookies:
        arr = cookie.split(";")
        (name, val) = arr[0].split("=")
        res[name] = val
    return res


def make_app(domain, redirect_url):
    """Creates a Mastodon app on a given host"""
    (client_id, client_secret) = Mastodon.create_app(
        "Mastondon List Manager",
        scopes=["read:lists", "read:follows", "read:accounts", "write:lists"],
        redirect_uris=redirect_url,
        api_base_url=f"https://{domain}",
    )
    return (client_id, client_secret)


def get_cookie(event):
    """Retrieves the auth cookie from the event object"""
    headers = event.get("headers", {})
    cookie = headers.get("authorization", None)
    return cookie


def response(body, statusCode=200):
    """Construct a lambda response object"""
    # Log a mesasge for error-like things.
    if statusCode >= 404:
        logging.error("Returning %s with %s", statusCode, body)
    elif statusCode >= 400:
        logging.info("Returning %s with %s", statusCode, body)
    return {
        "statusCode": statusCode,
        "body": body,
    }


def err_response(msg):
    """Construct a lambda error response"""
    obj = {"status": msg}
    return response(json.dumps(obj), statusCode=500)


def blocked_response():
    """Returns a 'blocked' response"""
    return err_response("blocked")


def meta(event, _):
    """
    Handler to get metadata which will drive further fetches.
    """

    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        me = mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("ERROR - illegal argument")
    except MastodonInternalServerError:
        return err_response("ERROR - internal server error")
    except (MastodonUnauthorizedError, NoAuthInfo):
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)
    except NotMastodon:
        return blocked_response()

    ainfo = Datastore.get_auth(cookie)
    domain = "" if ainfo is None else ainfo.domain
    meinfo = {
        "username": me["username"],
        "acct": f"{me['acct']}@{domain}",
        "display_name": me["display_name"],
        "following_count": me["following_count"],
    }

    # Also fetch lists (sadly, sizes not available!)
    lsts = mastodon.lists()

    output = {"me": meinfo, "lists": lsts}
    return response(json.dumps(output))


def following(event, _):
    """
    Endpoint which enumerates followers
    """
    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        if mastodon is None:
            resp = {"status": "no_cookie"}
            return response(json.dumps(resp), statusCode=403)
        me = mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("ERROR - illegal argument")
    except MastodonInternalServerError:
        return err_response("ERROR - internal server error")
    except (MastodonUnauthorizedError, NoAuthInfo):
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    me_id = me["id"]
    logging.info(
        "Getting %d accounts from %s for %s",
        me["following_count"],
        mastodon.api_base_url,
        me["acct"],
    )
    page1 = mastodon.account_following(me_id)
    accts = mastodon.fetch_remaining(page1)
    outpeople = [
        {
            k: str(x[k]) if k == "id" else x[k]
            for k in [
                "id",
                "display_name",
                "username",
                "acct",
                "note",
                "avatar",
            ]
        }
        for x in accts
    ]

    logging.info("Returning %d followers", len(outpeople))

    return response(json.dumps(outpeople))


def lists(event, _):
    """
    Endpoint which returns info about lists
    """

    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        if mastodon is None:
            resp = {"status": "no_cookie"}
            return response(json.dumps(resp), statusCode=403)
        # Ensure we are connected
        mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("ERROR - illegal argument")
    except MastodonInternalServerError:
        return err_response("ERROR - internal server error")
    except (MastodonUnauthorizedError, NoAuthInfo):
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    # Pull our lists
    logging.debug("info: lists")
    lsts = mastodon.lists()
    output = {}
    for l in lsts:
        logging.debug("info: list_accounts")
        page1 = mastodon.list_accounts(l["id"])
        accts = mastodon.fetch_remaining(page1)
        output[l["id"]] = [str(x["id"]) for x in accts]

    logging.info(
        "Returning lists of length %s", str([len(v) for _, v in output.items()])
    )

    return response(json.dumps(output))


def make_redirect_url(event, domain):
    """Create a redirect URL based on the origin of the request"""
    origin = event["headers"]["origin"]
    if origin == "http://localhost:3000":
        return f"http://localhost:3000/callback?domain={domain}"
    return f"https://acbeers.github.io/mastodonlm/callback?domain={domain}"


def make_cookie_options(event):
    """Create a cookie options based on the request"""
    host = event["headers"]["host"]
    if host[-13:] == "amazonaws.com":
        return "Domain=amazonaws.com; SameSite=None; Secure; "
    return "Domain=localhost; "


def cleandomain(domain):
    """Clean up a domain input - all lowercase, no @"""
    if domain is None:
        return domain

    return domain.strip().lower().replace("@", "")


def auth(event, _):
    """
    Handler for the start of an authentication flow.
    """
    # First, see if we have an active session
    cookie = get_cookie(event)

    params = event.get("queryStringParameters", {}) or {}
    domain = cleandomain(params.get("domain", None))

    # Ignore the cookie if it belongs to some other domain
    if cookie is not None:
        authinfo = Datastore.get_auth(cookie)
        if authinfo is not None:
            if domain is None:
                domain = authinfo.domain
            elif authinfo.domain != domain:
                cookie = None

    if cookie is not None:
        try:
            test = MastodonFactory.from_cookie(cookie)
            test.me()
            logging.info("Already logged in")
            return {"statusCode": 200, "body": json.dumps({"status": "OK"})}
        except MastodonAPIError:
            # If here, we aren't logged in, so drop through to start the
            # oAuth flow.
            pass
        except NoAuthInfo:
            # If here, we didn't get a mastodon instance back, so start the
            # oAuth flow
            pass

    # If we don't have a domain here, then we have to bail
    if domain is None or domain == "":
        return response(json.dumps({"status": "bad_host"}), statusCode=401)

    # See if this domain is allowed
    allow = Datastore.is_allowed(domain.lower())
    if not allow:
        res = {"status": "not_allowed"}
        logging.info("auth: domain denied: %s", domain)
        return response(json.dumps(res))

    logging.info("auth: starting OAuth path for %s", domain)

    # For now, we'll create the right redirect_url based on the event object.
    redirect_url = make_redirect_url(event, domain)

    cfg = Datastore.get_host_config(domain)

    if cfg is None:
        # Make an app
        logging.debug("auth: making app for %s", domain)
        try:
            (client_id, client_secret) = make_app(domain, redirect_url)
            logging.debug("auth: Made the app!")
        except MastodonNetworkError:
            logging.error("Bad host: %s", domain)
            return response(json.dumps({"status": "bad_host"}), statusCode=500)

        cfg = Datastore.set_host_config(
            domain, client_id=client_id, client_secret=client_secret
        )

    logging.debug("creating from config")
    try:
        mastodon = MastodonFactory.from_config(cfg)
    except NotMastodon:
        return blocked_response()

    logging.debug("created from config")

    url = mastodon.auth_request_url(
        scopes=["read:lists", "read:follows", "read:accounts", "write:lists"],
        redirect_uris=redirect_url,
    )
    return response(json.dumps({"url": url}))


def get_expire():
    """Compute a 1-day expire time"""
    now = datetime.datetime.now()
    expire = now + datetime.timedelta(days=1)
    unix = time.mktime(expire.timetuple())
    return unix


def callback(event, _):
    """The callback method of the oAuth dance"""

    # Need to know the domain to complete the oauth handshake.
    params = event.get("queryStringParameters", {}) or {}
    domain = params.get("domain", "UNKNOWN")
    code = params.get("code")

    cfg = Datastore.get_host_config(domain)
    logging.debug("callback for %s", domain)

    mastodon = Mastodon(
        client_id=cfg.client_id,
        client_secret=cfg.client_secret,
        user_agent=USER_AGENT,
        api_base_url=f"https://{domain}",
    )

    # For now, we'll create the right redirect_url based on the event object.
    redirect_url = make_redirect_url(event, domain)

    token = None
    try:
        token = mastodon.log_in(
            code=code,
            redirect_uri=redirect_url,
            scopes=["read:lists", "read:follows", "read:accounts", "write:lists"],
        )
    except MastodonIllegalArgumentError:
        logging.error(
            "MastodonIllegalArgumentError, code = %s, redirect_uri = %s, domain = %s",
            code,
            redirect_url,
            domain,
        )
        return err_response("ERROR - illegal argument")

    cookie = uuid.uuid4().urn

    Datastore.set_auth(cookie, token=token, domain=domain)

    return {"statusCode": 200, "body": json.dumps({"status": "OK", "auth": cookie})}


def add_to_list(event, _):
    """
    Handler for adding a user to a list.

    Parameters:
    - list_id - numeric idea of a Mastodon list
    - account_id - numeric id of a Mastodon user.
    """
    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("ERROR - illegal argument")
    except MastodonInternalServerError:
        return err_response("ERROR - internal server")
    except (MastodonUnauthorizedError, NoAuthInfo):
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)
    except NotMastodon:
        return blocked_response()

    lid = event["queryStringParameters"]["list_id"]
    accountid = event["queryStringParameters"]["account_id"]
    try:
        mastodon.list_accounts_add(lid, [accountid])
        return response(json.dumps({"status": "OK"}))
    except MastodonNotFoundError as e:
        logging.error("ERROR - not found: %s", str(e))
        return err_response("ERROR - not found")
    except MastodonUnauthorizedError as e:
        logging.error("ERROR - unauthorized: %s", str(e))
        return err_response("ERROR - unauthorized")
    except MastodonAPIError as e:
        logging.error("ERROR - other API error: %s", str(e))
        return err_response("ERROR - API error")


def remove_from_list(event, _):
    """
    Handler for removing a user from a list.

    Parameters:
    - list_id - numeric idea of a Mastodon list
    - account_id - numeric id of a Mastodon user.
    """
    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("Illegal argument")
    except MastodonInternalServerError:
        return err_response("Mastodon internal server error")
    except (MastodonUnauthorizedError, NoAuthInfo):
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)
    except NotMastodon:
        return blocked_response()

    lid = event["queryStringParameters"]["list_id"]
    accountid = event["queryStringParameters"]["account_id"]
    try:
        mastodon.list_accounts_delete(lid, [accountid])
        return response(json.dumps({"status": "OK"}))
    except MastodonNotFoundError as e:
        logging.error("ERROR - not found: %s", str(e))
        return err_response("ERROR - not found")
    except MastodonUnauthorizedError as e:
        logging.error("ERROR - unauthorized: %s", str(e))
        return err_response("ERROR - unauthorized")
    except MastodonAPIError as e:
        logging.error("ERROR - other API error: %s", str(e))
        return err_response("ERROR - API error")


def create_list(event, _):
    """Create a new list"""
    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("Illegal argument")
    except MastodonInternalServerError:
        return err_response("Mastodon internal server error")
    except (MastodonUnauthorizedError, NoAuthInfo):
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)
    except NotMastodon:
        return blocked_response()

    lname = event["queryStringParameters"]["list_name"]

    try:
        mastodon.list_create(lname)
        return response(json.dumps({"status": "OK"}))
    except MastodonNotFoundError as e:
        logging.error("ERROR - not found: %s", str(e))
        return err_response("ERROR - not found")
    except MastodonUnauthorizedError as e:
        logging.error("ERROR - unauthorized: %s", str(e))
        return err_response("ERROR - unauthorized")
    except MastodonAPIError as e:
        logging.error("ERROR - other API error: %s", str(e))
        return err_response("ERROR - API error")


def delete_list(event, _):
    """Remove a list"""
    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        mastodon.me()
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}
    except (MastodonUnauthorizedError, NoAuthInfo):
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)
    except NotMastodon:
        return blocked_response()

    lid = event["queryStringParameters"]["list_id"]

    try:
        mastodon.list_delete(lid)
        return response(json.dumps({"status": "OK"}))
    except MastodonNotFoundError as e:
        logging.error("ERROR - not found: %s", str(e))
        return err_response("ERROR - not found")
    except MastodonUnauthorizedError as e:
        logging.error("ERROR - unauthorized: %s", str(e))
        return err_response("ERROR - unauthorized")
    except MastodonAPIError as e:
        logging.error("ERROR - other API error: %s", str(e))
        return err_response("ERROR - API error")


def logout(event, _):
    """Logs out"""

    cookie = get_cookie(event)

    # Log out of the mastodon server
    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        mastodon.revoke_access_token()

        # Dump the cookie
        Datastore.drop_auth(cookie)
    except MastodonAPIError as e:
        logging.error("ERROR - other API error: %s", str(e))
        return err_response("ERROR - API error")

    return response(json.dumps({"status": "OK"}))


def block_update(_event, _context):
    """Pulls a list of hosts to block from github and populates our blocked host
    table"""

    # NOTE: There doesn't seem to be a Mastodon.py method for this.
    resp = requests.get(
        "https://hachyderm.io/api/v1/instance/domain_blocks", timeout=60
    )
    js = resp.json()
    Datastore.batch_block_host(js)
