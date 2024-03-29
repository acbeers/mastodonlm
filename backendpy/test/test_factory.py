"""Tests for Mastodon factory"""

import logging
from unittest.mock import MagicMock, patch, sentinel
from unittest import TestCase
from factory import MastodonFactory, USER_AGENT

# Here, reconfigure the logger to send output to a file during tests.
logging.basicConfig(level=logging.INFO, filename="debug_log.txt")


def mock_hostconfig():
    """Returns a mock HostConfig"""
    cfg = MagicMock()
    cfg.client_id = sentinel.client_id
    cfg.client_secret = sentinel.client_secret
    cfg.host = sentinel.host
    return cfg


class TestFactory(TestCase):
    """Tests for MastodonFactory methods"""

    @patch("factory.Mastodon")
    def test_fromconfig_notoken(self, mastomock):
        """Test for MastodonFactory.from_config without a token"""

        cfg = mock_hostconfig()
        MastodonFactory.from_config(cfg)

        mastomock.assert_called_with(
            client_id=sentinel.client_id,
            client_secret=sentinel.client_secret,
            access_token=None,
            user_agent=USER_AGENT,
            api_base_url=f"https://{sentinel.host}",
        )

    @patch("factory.Mastodon")
    def test_fromconfig_withtoken(self, mastomock):
        """Test for MastodonFactory.from_config with a token"""

        cfg = mock_hostconfig()
        MastodonFactory.from_config(cfg, token=sentinel.token)

        mastomock.assert_called_with(
            client_id=sentinel.client_id,
            client_secret=sentinel.client_secret,
            access_token=sentinel.token,
            user_agent=USER_AGENT,
            api_base_url=f"https://{sentinel.host}",
        )

    @patch("factory.Datastore")
    @patch("factory.MastodonFactory.from_config")
    def test_fromcookie(self, from_config, data_store):
        """Test for MastodonFactory.from_config with a token"""

        auth = MagicMock()
        auth.domain = sentinel.domain
        auth.token = sentinel.token
        data_store.get_auth.return_value = auth
        data_store.get_host_config.return_value = sentinel.host_config

        cookie = sentinel.cookie
        MastodonFactory.from_cookie(cookie)

        data_store.get_host_config.assert_called_with(sentinel.domain)
        from_config.assert_called_with(sentinel.host_config, token=sentinel.token)
