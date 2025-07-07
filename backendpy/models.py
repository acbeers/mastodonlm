"""Models for DynamoDB access"""

import datetime
import hashlib
import os
import time

from pynamodb.models import Model
from pynamodb.indexes import GlobalSecondaryIndex, AllProjection
from pynamodb.attributes import UnicodeAttribute, NumberAttribute


class MyModel(Model):
    """An extension to pynamodb.Model"""

    @classmethod
    def lookup(cls, key):
        """Lookup a single value or return none"""
        res = list(cls.query(key))
        if len(res) == 0:
            return None
        return res[0]


class AuthTable(MyModel):
    """
    Auth information for a user
    """

    class Meta:
        """Metadata for this table"""

        table_name = os.environ.get("TABLE_AUTH", "list-manager-auth-dev")
        region = "us-west-2"

    key = UnicodeAttribute(hash_key=True)
    token = UnicodeAttribute()
    domain = UnicodeAttribute()
    expires_at = NumberAttribute()


class AllowedHost(MyModel):
    """
    A list of allowed hosts
    """

    class Meta:
        """Metadata for this table"""

        table_name = os.environ.get("TABLE_ALLOWED", "list-manager-allowedHosts-dev")
        region = "us-west-2"

    host = UnicodeAttribute(hash_key=True)


class BlockedHost(MyModel):
    """
    A list of blocked hosts
    """

    class Meta:
        """Metadata for this table"""

        table_name = os.environ.get("TABLE_BLOCKED", "list-manager-blockedHosts-dev")
        region = "us-west-2"

    hash = UnicodeAttribute(hash_key=True)
    host = UnicodeAttribute()
    timestamp = UnicodeAttribute()


class HostConfig(MyModel):
    """
    A list of allowed hosts
    """

    class Meta:
        """Metadata for this table"""

        table_name = os.environ.get("TABLE_HOSTCFG", "list-manager-hostConfig-dev")
        region = "us-west-2"

    host = UnicodeAttribute(hash_key=True)
    client_id = UnicodeAttribute()
    client_secret = UnicodeAttribute()


def get_expire():
    """Compute a 1-day expire time"""
    now = datetime.datetime.now()
    expire = now + datetime.timedelta(days=1)
    unix = time.mktime(expire.timetuple())
    return unix


class Datastore:
    """A mockable interface to the above ORM classes"""

    @classmethod
    def get_auth(cls, cookie):
        """Given a cookie, returns any auth associated with it or None"""
        return AuthTable.lookup(cookie)

    @classmethod
    def set_auth(cls, cookie, token, domain):
        """Sets a token and domain for a given cookie"""
        authinfo = AuthTable(
            cookie, token=token, domain=domain, expires_at=get_expire()
        )
        authinfo.save()

    @classmethod
    def drop_auth(cls, cookie):
        """Drop the token associated with the cookie"""
        authinfo = cls.get_auth(cookie)
        if authinfo is not None:
            authinfo.delete()

    @classmethod
    def is_allowed(cls, host):
        """Returns true if this host is allowed"""

        # Host is blocked if on the blocklist, unless it is also on the allow
        # list.
        lhost = host.lower().strip()
        allow = AllowedHost.lookup(lhost)
        if allow is not None:
            return True

        # Hosts are stored as a hash
        m = hashlib.sha256()
        m.update(lhost.encode("utf-8"))
        sha = m.hexdigest()
        block = BlockedHost.lookup(sha)
        return block is None

    @classmethod
    def block_host(cls, sha, host):
        """Adds an entry to the blocked hosts list"""
        bh = BlockedHost(sha, host=host)
        bh.save()

    @classmethod
    def batch_block_host(cls, hosts, ts):
        """Adds multiple entries to the blocked host list"""

        # First, write/update the new hosts
        with BlockedHost.batch_write() as batch:
            items = [
                BlockedHost(x["digest"], host=x["domain"], timestamp=str(ts))
                for x in hosts
            ]
            for item in items:
                batch.save(item)
                # Manual rate limiting. This is dumb, but batch_write() doesn't
                # support rate-limiting in pynamodb.
                time.sleep(0.1)

        # Now, query for and delete hosts that didn't get updated
        # Since this involves a scan, it will be expensive.  But, the blocked table
        # is generally pretty small, so I'm not going to worry about it for now.
        cnt = 0
        for item in BlockedHost.scan(BlockedHost.timestamp != str(ts), rate_limit=1):
            item.delete()
            cnt = cnt + 1

    @classmethod
    def get_host_config(cls, host):
        """Returns configuration information for the host"""
        cfg = HostConfig.lookup(host)
        return cfg

    @classmethod
    def set_host_config(cls, host, client_id, client_secret):
        """Stores client ID and secret for the given host"""
        cfg = HostConfig(host, client_id=client_id, client_secret=client_secret)
        cfg.save()
        return cfg
