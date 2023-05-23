"""Handler for list manager functions"""

import datetime
import json
import logging
import time
import uuid

from mastodon import (
    MastodonAPIError,
    MastodonNotFoundError,
    MastodonIllegalArgumentError,
    MastodonInternalServerError,
    MastodonUnauthorizedError,
)

from factory import MastodonFactory, NoAuthInfo, NotMastodon
from models import Datastore
from shared import callback_helper
from utils import response, err_response, blocked_response

# AWS doens't set a logging level, so set it here.
logging.getLogger("root").setLevel(logging.INFO)
# But don't log much from botocore
logging.getLogger("botocore").setLevel(logging.ERROR)


def parse_cookies(cookies):
    """Do a simple parse of a list of cookies, turning it into a name:value dict"""
    res = {}
    for cookie in cookies:
        arr = cookie.split(";")
        (name, val) = arr[0].split("=")
        res[name] = val
    return res


def get_cookie(event):
    """Retrieves the auth cookie from the event object"""
    headers = event.get("headers", {})
    cookie = headers.get("authorization", None)
    return cookie


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
    for x in lsts:
        x["id"] = str(x["id"])

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

    logging.info("Returning %d following", len(outpeople))

    return response(json.dumps(outpeople))

def followers(event, _):
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
        "Getting %d follower accounts from %s for %s",
        me["following_count"],
        mastodon.api_base_url,
        me["acct"],
    )
    page1 = mastodon.account_followers(me_id)
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


def get_expire():
    """Compute a 1-day expire time"""
    now = datetime.datetime.now()
    expire = now + datetime.timedelta(days=1)
    unix = time.mktime(expire.timetuple())
    return unix


def callback(event, context):
    """oAuth callback for the server-side version of the API"""

    def finish(token):
        params = event.get("queryStringParameters", {}) or {}
        domain = params.get("domain", "UNKNOWN")

        cookie = uuid.uuid4().urn

        Datastore.set_auth(cookie, token=token, domain=domain)

        return {"statusCode": 200, "body": json.dumps({"status": "OK", "auth": cookie})}

    return callback_helper(event, context, finish)


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
    accountids = event["queryStringParameters"]["account_id"].split(",")
    try:
        mastodon.list_accounts_add(lid, accountids)
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
        listobj = mastodon.list_create(lname)
        listobj["id"] = str(listobj["id"])
        return response(json.dumps({"status": "OK", "list": listobj}))
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


def importToList(event, _):
    """Import a set of users into a list"""
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

    # First, translate accounts to IDs
    lid = event["queryStringParameters"]["list_id"]
    print(lid)
    accts = event["queryStringParameters"]["accts"].split(",")
    print(accts)

    ids = [mastodon.account_lookup(acct).id for acct in accts]
    print(ids)

    try:
        mastodon.list_accounts_add(lid, ids)
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



def build_error_response(err):
    """Given an error, build an error response"""
    try:
        raise err
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}
    except (MastodonUnauthorizedError, NoAuthInfo):
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)
    except NotMastodon:
        return blocked_response()
