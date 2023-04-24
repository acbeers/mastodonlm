"""Functions shared between server and client implementations"""

import json
import logging
import os
import requests

from mastodon import (
    Mastodon,
    MastodonAPIError,
    MastodonIllegalArgumentError,
    MastodonNetworkError,
)

from factory import MastodonFactory, NoAuthInfo, NotMastodon, USER_AGENT
from models import Datastore
from utils import (
    get_cookie,
    response,
    cleandomain,
    blocked_response,
    err_response,
    badhost_response,
)


def make_app(domain, redirect_url):
    """Creates a Mastodon app on a given host"""
    # Some web gateways will block requests without a User-Agent header
    # The Mastodon object can be constructed with an agent= parameter, but
    # the create_app class method doesn't support it.  Create a session with the
    # correct header
    s = requests.Session()
    s.headers.update({"User-Agent":USER_AGENT})
    (client_id, client_secret) = Mastodon.create_app(
        "Mastodon List Manager",
        scopes=["read:lists", "read:follows", "read:accounts", "write:lists"],
        redirect_uris=redirect_url,
        session=s,
        api_base_url=f"https://{domain}",
    )
    return (client_id, client_secret)


def make_redirect_url(event, domain):
    """Create a redirect URL based on the origin of the request"""
    origin = event["headers"]["origin"]
    redirect_base = os.environ.get("AUTH_REDIRECT", "http://localhost:3000")
    redirect = f"{redirect_base}/callback?domain={domain}"
    return redirect


def auth(event, _):
    """
    Handler for the start of an authentication flow.
    """
    # First, see if we have an active session
    cookie = get_cookie(event)

    params = event.get("queryStringParameters", {}) or {}
    rawdomain = params.get("domain", None)
    domain = cleandomain(rawdomain)

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
        return badhost_response(domain)

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
        except MastodonNetworkError as e:
            # Log what the user typed with the error.
            print("mastodon network error")
            print(e)
            print(redirect_url)
            return badhost_response(rawdomain)

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


def callback_helper(event, _, finish):
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

    return finish(token)
