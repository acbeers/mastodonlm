"""Handler for list manager functions"""

import json
from mastodon import Mastodon, MastodonAPIError
from cfg import Config

mastodon = Mastodon(
    client_id=Config.client_id,
    client_secret=Config.client_secret,
    access_token=Config.access_token,
    api_base_url="https://hachyderm.io",
)
mastodon.log_in(
    username=Config.username,
    password=Config.password,
    scopes=["read:lists", "read:follows", "read:accounts", "write:lists"],
    to_file="pytooter_usercred.secret",
)


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
    """Returns info for a"""
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
            k: str(x[k])
            for k in ["id", "lists", "display_name", "username", "note", "avatar"]
        }
        for x in followers
    ]

    output = {"lists": outlists, "followers": outpeople}
    return json.dumps(output)


def add_to_list(event, context):
    lid = event["queryStringParameters"]["list_id"]
    accountid = event["queryStringParameters"]["account_id"]
    try:
        mastodon.list_accounts_add(lid, [accountid])
        return {"statusCode": 200, "body": "OK"}
    except MastodonAPIError:
        return {"statusCode": 500, "body": "ERROR"}


def remove_from_list(event, context):
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
