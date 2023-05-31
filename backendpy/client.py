"""Functions supporting client-side implementation"""

import json
import logging

from mastodon import (
    MastodonAPIError,
)

from factory import MastodonFactory, NoAuthInfo
from models import Datastore
from shared import callback_helper
from utils import err_response, response


def clientlogout(event, _):
    """Logs out, given an oauth token and a domain"""

    body = json.loads(event["body"])
    token = body.get("token", None)
    domain = body.get("domain", None)

    # Log out of the mastodon server
    try:
        cfg = Datastore.get_host_config(domain)
        if cfg is None:
            raise NoAuthInfo

        mastodon = MastodonFactory.from_config(cfg, token=token)
        mastodon.revoke_access_token()

    except MastodonAPIError as e:
        logging.error("ERROR - other API error: %s", str(e))
        return err_response("ERROR - API error")
    except NoAuthInfo:
        return err_response(f"ERROR no host config found for {domain}")

    return response(json.dumps({"status": "OK"}))


def clientcallback(event, context):
    """oAuth callback for the client-side version of the API"""

    def finish(token):
        return response(json.dumps({"status": "OK", "token": token}))

    return callback_helper(event, context, finish)
