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
)

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

        return MastodonFactory.from_config(cfg)

    @classmethod
    def from_config(cls, cfg):
        """Create a Mastodon interface from a HostConfig object"""
        mastodon = Mastodon(
            client_id=cfg.client_id,
            client_secret=cfg.client_secret,
            # access_token=authinfo.token,
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
    """Calls a paginated function func, which is assumed to be a method
    on a Mastodon instance, and returns a list of all results"""
    res = []
    page = func(*args)
    while True:
        res.extend(page)
        try:
            page = func(
                *args,
                max_id=page._pagination_next[
                    "max_id"
                ],  # pylint: disable=protected-access
            )
        except AttributeError:
            # It looks like _pagination_next isn't an attribute when there is no
            # further data.
            break
    return res


def info(event, _):
    """
    Handler to get the lists and follower information that the webapp needs.
    """

    cookies = parse_cookies(event.get("cookies", []))
    cookie = cookies.get("list-manager-cookie", None)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = get_mastodon(cookie)
        me = mastodon.me()
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonUnauthorizedError as e:
        print(e)
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    # Find out info about me
    me_id = me["id"]
    # And people I follow
    followers = get_all(mastodon.account_following, me_id)
    for f in followers:
        f["lists"] = []
    followermap = {x["id"]: x for x in followers}

    # Pull our lists
    lists = mastodon.lists()
    for l in lists:
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
    return json.dumps(output)


def response(body, statusCode=200):
    """Construct a lambda response object"""
    return {
        "statusCode": statusCode,
        "body": body,
    }


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


def auth(event, _):
    """
    Handler for the start of an authentication flow.
    """
    # First, see if we have an active session
    cookies = parse_cookies(event.get("cookies", []))
    cookie = cookies.get("list-manager-cookie", None)

    params = event.get("queryStringParameters", {}) or {}
    domain = params.get("domain", None)

    # Ignore the cookie if it belongs to some other domain
    if cookie is not None:
        authinfo = Datastore.get_auth(cookie)
        if domain is None:
            domain = authinfo.domain
        if authinfo is not None and authinfo.domain != domain:
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

    # See if this domain is allowed
    allow = Datastore.is_allowed(domain)
    if not allow:
        res = {"status": "not_allowed"}
        return response(json.dumps(res))

    # For now, we'll create the right redirect_url based on the event object.
    redirect_url = make_redirect_url(event, domain)

    cfg = Datastore.get_host_config(domain)

    if cfg is None:
        # Make an app
        (client_id, client_secret) = make_app(domain, redirect_url)
        cfg = Datastore.set_host_config(
            domain, client_id=client_id, client_secret=client_secret
        )
        cfg.save()

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

    mastodon = Mastodon(
        client_id=cfg.client_id,
        client_secret=cfg.client_secret,
        api_base_url=f"https://{domain}",
    )

    # For now, we'll create the right redirect_url based on the event object.
    redirect_url = make_redirect_url(event, domain)
    cookie_options = make_cookie_options(event)

    token = mastodon.log_in(
        code=code,
        redirect_uri=redirect_url,
        scopes=["read:lists", "read:follows", "read:accounts", "write:lists"],
    )
    cookie = uuid.uuid4().urn

    Datastore.set_auth(cookie, token=token, domain=domain)

    cookie_str = f"{cookie}; {cookie_options} Max-Age={60*60*24}"
    return {
        "statusCode": 200,
        "headers": {"Set-Cookie": f"list-manager-cookie={cookie_str}"},
        "body": '{"status":"OK"}',
    }


def add_to_list(event, _):
    """
    Handler for adding a user to a list.

    Parameters:
    - list_id - numeric idea of a Mastodon list
    - account_id - numeric id of a Mastodon user.
    """
    cookies = parse_cookies(event["cookies"])
    cookie = cookies.get("list-manager-cookie", None)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = get_mastodon(cookie)
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}

    lid = event["queryStringParameters"]["list_id"]
    accountid = event["queryStringParameters"]["account_id"]
    try:
        mastodon.list_accounts_add(lid, [accountid])
        return response("OK")
    except MastodonAPIError:
        return response("ERROR", statusCode=500)


def remove_from_list(event, _):
    """
    Handler for removing a user from a list.

    Parameters:
    - list_id - numeric idea of a Mastodon list
    - account_id - numeric id of a Mastodon user.
    """
    cookies = parse_cookies(event["cookies"])
    cookie = cookies.get("list-manager-cookie", None)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = get_mastodon(cookie)
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}

    lid = event["queryStringParameters"]["list_id"]
    accountid = event["queryStringParameters"]["account_id"]
    try:
        mastodon.list_accounts_delete(lid, [accountid])
        return response("OK")
    except MastodonAPIError:
        return response("ERROR", statusCode=500)


def create_list(event, _):
    """Create a new list"""
    cookies = parse_cookies(event["cookies"])
    cookie = cookies.get("list-manager-cookie", None)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = get_mastodon(cookie)
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}

    lname = event["queryStringParameters"]["list_name"]

    try:
        mastodon.list_create(lname)
        return response("OK")
    except MastodonAPIError:
        return response("ERROR", statusCode=500)


def delete_list(event, _):
    """Remove a list"""
    cookies = parse_cookies(event["cookies"])
    cookie = cookies.get("list-manager-cookie", None)

    # If we have no cookie, tell the client to go away
    if cookie is None:
        resp = {"status": "no_cookie"}
        return response(json.dumps(resp), statusCode=403)

    try:
        mastodon = get_mastodon(cookie)
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}

    lid = event["queryStringParameters"]["list_id"]

    try:
        mastodon.list_delete(lid)
        return response("OK")
    except MastodonAPIError:
        return response("ERROR", statusCode=500)
