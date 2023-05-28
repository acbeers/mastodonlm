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
