"""Factory class for Mastodon instances"""

from mastodon import (
    Mastodon,
)
from models import Datastore

# Our User Agent
USER_AGENT = "mastodonlistmanager"


class NoAuthInfo(Exception):
    """Internal exception class for when we don't have auth info"""


class NotMastodon(Exception):
    """Internal exception for when we think we don't have a Mastodon connection"""


class MastodonFactory:
    """Factory class for Mastodon instances"""

    @classmethod
    def from_cookie(cls, cookie):
        """Construct a mastodon object from the cookie"""
        authinfo = Datastore.get_auth(cookie)
        if authinfo is None:
            raise NoAuthInfo

        # Get the configuration that we need
        cfg = Datastore.get_host_config(authinfo.domain)
        if cfg is None:
            raise NoAuthInfo

        return MastodonFactory.from_config(cfg, token=authinfo.token)

    @classmethod
    def from_config(cls, cfg, token=None):
        """Create a Mastodon interface from a HostConfig object"""
        mastodon = Mastodon(
            client_id=cfg.client_id,
            client_secret=cfg.client_secret,
            access_token=token,
            user_agent=USER_AGENT,
            api_base_url=f"https://{cfg.host}",
        )
        # If the version check failed, then most likely this is an unusable
        # instance.  This can happen when e.g. we are blocked by CloudFlare
        if not mastodon.version_check_worked:
            raise NotMastodon

        return mastodon
