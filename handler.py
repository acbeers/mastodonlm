"""Handler for list manager functions"""

import datetime
import json
import time
import uuid

import boto3


from mastodon import (
    Mastodon,
    MastodonAPIError,
    MastodonIllegalArgumentError,
    MastodonInternalServerError,
)
from cfg import Config


# We hold mappings of users to tokens in a database.
# For testing, this is our stupid database.


class Database:
    """Simple database interface that abstracts Dynamo"""

    _data = {}
    _client = boto3.client("dynamodb")

    @staticmethod
    def get(cookie):
        """Gets the auth token associated with the cookie"""
        resp = Database._client.get_item(
            TableName="authTable", Key={"key": {"S": cookie}}, AttributesToGet=["token"]
        )
        if "Item" in resp:
            return resp["Item"]["token"]["S"]
        return None

    @staticmethod
    def set(cookie, token):
        """Sets the auth token associated with the cookie"""
        now = datetime.datetime.now()
        expire = now + datetime.timedelta(days=1)
        unix = time.mktime(expire.timetuple())
        item = {
            "key": {"S": cookie},
            "token": {"S": token},
            "expires_at": {"N": str(unix)},
        }
        Database._client.put_item(TableName="authTable", Item=item)


def parse_cookies(cookies):
    """Do a simple parse of a list of cookies, turning it into a name:value dict"""
    res = {}
    for cookie in cookies:
        arr = cookie.split(";")
        (name, val) = arr[0].split("=")
        res[name] = val
    return res

def get_mastodon(cookie):
    token = Database.get(cookie)
    mastodon = Mastodon(
        client_id=Config.client_id,
        client_secret=Config.client_secret,
        access_token=token,
        api_base_url="https://hachyderm.io",
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
            page = func(*args, max_id=page._pagination_next["max_id"])
        except AttributeError:
            # It looks like _pagination_next isn't an attribute when there is no
            # further data.
            break
    return res


def info(event, context):
    """
    Handler to get the lists and follower information that the webapp needs.
    """

    cookies = parse_cookies(event["cookies"])
    cookie = cookies["list-manager-cookie"]

    try:
        mastodon = get_mastodon(cookie)
    except MastodonIllegalArgumentError:
        return {"statusCode": 500, "body": "ERROR"}
    except MastodonInternalServerError:
        return {"statusCode": 500, "body": "ERROR"}

    # Find out info about me
    me = mastodon.me()
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

    output = {"lists": outlists, "followers": outpeople}
    return json.dumps(output)


def auth(event, context):
    """
    Handler for the start of an authentication flow.
    """
    # First, see if we have an active session
    cookies = parse_cookies(event["cookies"])
    cookie = cookies.get("list-manager-cookie", None)
    if cookie is not None:
        try:
            test = get_mastodon(cookie)
            test.me()
            print("Already logged in")
            return {"statusCode": 200, "body": json.dumps({"status": "OK"})}
        except MastodonAPIError:
            # If here, we aren't logged in, so drop through to start the
            # oAuth flow.
            pass

    # TODO: Map this to a place where I store secrets.
    mastodon = Mastodon(
        client_id=Config.client_id,
        client_secret=Config.client_secret,
        access_token=Config.access_token,
        api_base_url="https://hachyderm.io",
    )
    url = mastodon.auth_request_url(
        scopes=["read:lists", "read:follows", "read:accounts", "write:lists"],
        redirect_uris="http://localhost:3000/callback",
    )
    return {"statusCode": 200, "body": json.dumps({"url": url})}


def callback(event, context):
    code = event["queryStringParameters"]["code"]
    mastodon = Mastodon(
        client_id=Config.client_id,
        client_secret=Config.client_secret,
        access_token=Config.access_token,
        api_base_url="https://hachyderm.io",
    )

    token = mastodon.log_in(
        code=code,
        redirect_uri="http://localhost:3000/callback",
        scopes=["read:lists", "read:follows", "read:accounts", "write:lists"],
    )
    cookie = uuid.uuid4().urn
    Database.set(cookie, token)

    cookie_str = f"{cookie}; Domain=localhost; Max-Age={60*60*24}"
    return {
        "statusCode": 200,
        "multiValueHeaders": {"Set-Cookie": f"list-manager-cookie={cookie_str}"},
        "body": '{"status":"OK"}',
    }


def add_to_list(event, context):
    """
    Handler for adding a user to a list.

    Parameters:
    - list_id - numeric idea of a Mastodon list
    - account_id - numeric id of a Mastodon user.
    """
    cookies = parse_cookies(event["cookies"])
    cookie = cookies["list-manager-cookie"]

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
        return {"statusCode": 200, "body": "OK"}
    except MastodonAPIError:
        return {"statusCode": 500, "body": "ERROR"}


def remove_from_list(event, context):
    """
    Handler for removing a user from a list.

    Parameters:
    - list_id - numeric idea of a Mastodon list
    - account_id - numeric id of a Mastodon user.
    """
    cookies = parse_cookies(event["cookies"])
    cookie = cookies["list-manager-cookie"]

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
        return {"statusCode": 200, "body": "OK"}
    except MastodonAPIError:
        return {"statusCode": 500, "body": "ERROR"}


def create_list():
    pass


def remove_list():
    pass
