"""Server auth backend for Mastodon List Manager"""

import json
import logging
import uuid

from mastodon import (
    MastodonAPIError,
)

from factory import MastodonFactory
from models import Datastore
from shared import callback_helper
from utils import response, err_response

# AWS doens't set a logging level, so set it here.
logging.getLogger("root").setLevel(logging.INFO)
# But don't log much from botocore
logging.getLogger("botocore").setLevel(logging.ERROR)


def get_cookie(event):
    """Retrieves the auth cookie from the event object"""
    headers = event.get("headers", {})
    cookie = headers.get("authorization", None)
    return cookie


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
