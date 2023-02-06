"""Lambda routines that don't directly process requests"""

import boto3
import requests
from models import Datastore

def block_update(_event, _context):
    """Pulls a list of hosts to block from github and populates our blocked host
    table"""

    # NOTE: There doesn't seem to be a Mastodon.py method for this.
    resp = requests.get(
        "https://hachyderm.io/api/v1/instance/domain_blocks", timeout=60
    )
    js = resp.json()
    Datastore.batch_block_host(js)

