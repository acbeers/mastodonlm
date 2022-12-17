"""Handler for list manager functions"""

import datetime
import json
import time
import uuid

from mastodon import (
    Mastodon,
    MastodonAPIError,
    MastodonIllegalArgumentError,
    MastodonInternalServerError,
    MastodonUnauthorizedError,
    MastodonNetworkError
)
import requests

from models import Datastore


class MastodonFactory:
    """Factory class for Mastodon instances"""

    @classmethod
    def from_cookie(cls, cookie):
        """Construct a mastodon object from the cookie"""
        authinfo = Datastore.get_auth(cookie)
        if authinfo is None:
            return None

        # Get the configuration that we need
        cfg = Datastore.get_host_config(authinfo.domain)
        if cfg is None:
            return None

        return MastodonFactory.from_config(cfg, token=authinfo.token)

    @classmethod
    def from_config(cls, cfg, token=None):
        """Create a Mastodon interface from a HostConfig object"""
        mastodon = Mastodon(
            client_id=cfg.client_id,
            client_secret=cfg.client_secret,
            access_token=token,
            api_base_url=f"https://{cfg.host}",
        )
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


def get_mastodon(cookie):
    """Construct a Mastodon objecct for the given cookie"""
    # Get cookie
    # Lookup domain info from cookie.domain
    # If no domain info, then register app with domain.
    return MastodonFactory.from_cookie(cookie)


def get_mastodon_from_config(cfg, domain):
    """Create a Mastodon interface from a HostConfig object"""
    mastodon = Mastodon(
        client_id=cfg.client_id,
        client_secret=cfg.client_secret,
        # access_token=authinfo.token,
        api_base_url=f"https://{domain}",
    )
    return mastodon


def get_all(func, *args):
    # pylint: disable=protected-access
    """Calls a paginated function func, which is assumed to be a method
    on a Mastodon instance, and returns a list of all results"""
    res = []
    page = func(*args)
    while True:
        res.extend(page)
        try:
            page = func(
                *args,
                max_id=page._pagination_next["max_id"],
            )
        except AttributeError:
            # It looks like _pagination_next isn't an attribute when there is no
            # further data.
            break
    return res


def get_cookie(event):
    """Retrieves the auth cookie from the event object"""
    headers = event.get("headers", {})
    cookie = headers.get("authorization", None)
    return cookie

def response(body, statusCode=200):
    """Construct a lambda response object"""
    # Log a mesasge for error-like things.
    if statusCode >= 400:
        print(f"[ERROR] Returning {statusCode} with {body}")
    return {
        "statusCode": statusCode,
        "body": body,
    }

def err_response(msg):
    """Construct a lambda error response"""
    obj = {"status": msg}
    return response(json.dumps(obj),statusCode=500)




def info(event, _):
    """
    Handler to get the lists and follower information that the webapp needs.
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
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonUnauthorizedError:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    # Find out info about me
    me_id = me["id"]
    # And people I follow
    print("info: get_all")
    followers = get_all(mastodon.account_following, me_id)
    for f in followers:
        f["lists"] = []
    followermap = {x["id"]: x for x in followers}

    # Pull our lists
    print("info: lists")
    lists = mastodon.lists()
    for l in lists:
        print("info: list_accounts")
        accts = get_all(mastodon.list_accounts, l["id"])
        for acct in accts:
            aid = acct["id"]
            if aid in followermap:
                followermap[aid]["lists"].append(l["id"])
            else:
                # This is someone I'm not following
                pass

    # Return:
    # - lists with ids
    # - followers with ids, lists they are on.
    # Also convert IDs to strings, since they are bigints which don't work well in JS.
    outlists = lists
    outpeople = [
        {
            k: str(x[k]) if k == "id" else x[k]
            for k in [
                "id",
                "lists",
                "display_name",
                "username",
                "acct",
                "note",
                "avatar",
            ]
        }
        for x in followers
    ]

    res = Datastore.get_auth(cookie)
    domain = "" if res is None else res.domain
    meinfo = {
        "username": me["username"],
        "acct": f"{me['acct']}@{domain}",
        "display_name": me["display_name"],
    }
    output = {"lists": outlists, "followers": outpeople, "me": meinfo}
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
            if test is None:
                raise AttributeError
            test.me()
            print("Already logged in")
            return {"statusCode": 200, "body": json.dumps({"status": "OK"})}
        except MastodonAPIError:
            # If here, we aren't logged in, so drop through to start the
            # oAuth flow.
            pass
        except AttributeError:
            # If here, we didn't get a mastodon instance back, so start the
            # oAuth flow
            pass

    # If we don't have a domain here, then we have to bail
    if domain is None:
        return response(json.dumps({"status": "no_login"}), statusCode=401)

    # See if this domain is allowed
    allow = Datastore.is_allowed(domain.lower())
    if not allow:
        res = {"status": "not_allowed"}
        print(f"auth: domain denied: {domain}")
        return response(json.dumps(res))

    print(f"auth: starting OAuth path for {domain}")

    # For now, we'll create the right redirect_url based on the event object.
    redirect_url = make_redirect_url(event, domain)

    cfg = Datastore.get_host_config(domain)

    if cfg is None:
        # Make an app
        print(f"auth: making app for {domain}")
        try:
            (client_id, client_secret) = make_app(domain, redirect_url)
            print("auth: Made the app!")
        except MastodonNetworkError:
            return response(json.dumps({"status":"bad_host"}),statusCode=500)

        cfg = Datastore.set_host_config(
            domain, client_id=client_id, client_secret=client_secret
        )
    mastodon = MastodonFactory.from_config(cfg)
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

    # The challenge here - I don't know what server that this code is associated with.
    # I need to ensure that "domain" comes back here.
    # The web app also doesn't necessarily know this.
    params = event.get("queryStringParameters", {}) or {}
    domain = params.get("domain", "hachyderm.io")
    code = params.get("code")

    cfg = Datastore.get_host_config(domain)
    print(f"callback for {domain}")

    mastodon = Mastodon(
        client_id=cfg.client_id,
        client_secret=cfg.client_secret,
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
        print(f"[ERROR] MastodonIllegalArgumentError, code = {code}, redirect_uri = {redirect_url}")
        raise
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
        # FIXME: from_cookie can return None!
        mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("ERROR - illegal argument")
    except MastodonInternalServerError:
        return err_response("ERROR - internal server")
    except MastodonUnauthorizedError:
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)

    lid = event["queryStringParameters"]["list_id"]
    accountid = event["queryStringParameters"]["account_id"]
    try:
        mastodon.list_accounts_add(lid, [accountid])
        return response("OK")
    except MastodonAPIError:
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
        # FIXME: from_cookie can return None!
        mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("Illegal argument")
    except MastodonInternalServerError:
        return err_response("Mastodon internal server error")
    except MastodonUnauthorizedError:
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)

    lid = event["queryStringParameters"]["list_id"]
    accountid = event["queryStringParameters"]["account_id"]
    try:
        mastodon.list_accounts_delete(lid, [accountid])
        return response("OK")
    except MastodonAPIError:
        return err_response("ERROR")


def create_list(event, _):
    """Create a new list"""
    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        # FIXME: from_cookie can return None!
        mastodon.me()
    except MastodonIllegalArgumentError:
        return err_response("Illegal argument")
    except MastodonInternalServerError:
        return err_response("Mastodon internal server error")
    except MastodonUnauthorizedError:
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)

    lname = event["queryStringParameters"]["list_name"]

    try:
        mastodon.list_create(lname)
        return response("OK")
    except MastodonAPIError:
        return err_response("ERROR")


def delete_list(event, _):
    """Remove a list"""
    cookie = get_cookie(event)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = MastodonFactory.from_cookie(cookie)
        # FIXME: from_cookie can return None!
        mastodon.me()
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonUnauthorizedError:
        resp = {"status": "not_authorized"}
        return response(json.dumps(resp), statusCode=403)

    lid = event["queryStringParameters"]["list_id"]

    try:
        mastodon.list_delete(lid)
        return response("OK")
    except MastodonAPIError:
        return err_response("ERROR")


def block_update(_event, _context):
    """Pulls a list of hosts to block from github and populates our blocked host
    table"""

    # NOTE: There doesn't seem to be a Mastodon.py method for this.
    resp = requests.get(
        "https://hachyderm.io/api/v1/instance/domain_blocks", timeout=60
    )
    js = resp.json()
    Datastore.batch_block_host(js)
