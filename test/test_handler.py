"""Tests for lambda handler"""

import json
from unittest.mock import MagicMock, patch, sentinel
from unittest import TestCase
import handler

from mastodon import MastodonAPIError


def mock_mastodon():
    """Returns a mock fo the Mastodon object"""
    res = MagicMock()
    res.auth_request_url.return_value = "https://mock_redirect"
    return res


class TestAuth(TestCase):
    """Tests for /auth methods"""

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory")
    @patch("handler.make_app")
    def test_auth_nocookie_newhost(self, make_app, factory, dataStore):
        """Test /auth when we haven't seen this host before"""

        event = {"headers": {"origin": "none"}}
        context = {}

        dataStore.is_allowed.return_value = True
        dataStore.get_host_config.return_value = None
        factory.from_config.return_value = mock_mastodon()
        make_app.return_value = ("id", "secret")

        res = handler.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        # And, we should call make_app
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have created a new mastodon app
        self.assertTrue(make_app.called)

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory")
    @patch("handler.make_app")
    def test_auth_nocookie_knownhost(self, make_app, factory, dataStore):
        """Test /auth when no cookie is present"""

        event = {"headers": {"origin": "none"}}
        context = {}

        dataStore.is_allowed.return_value = True
        factory.from_config.return_value = mock_mastodon()
        dataStore.get_host_config.return_value = sentinel.host_cfg

        res = handler.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_config.called_with(sentinel.host_cfg))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory")
    @patch("handler.make_app")
    def test_auth_cookie_valid(self, make_app, factory, data_store):
        """Test /auth when a cookie present and a valid session on a Mastodon server"""

        event = {
            "headers": {"origin": "none"},
            "cookies": ["list-manager-cookie=mycookie"],
        }
        context = {}

        mastodon = mock_mastodon()
        factory.from_config.return_value = mastodon
        mastodon.me.return_value = MagicMock()

        data_store.is_allowed.return_value = True
        auth = MagicMock()
        auth.domain = "mydomain"
        data_store.get_auth.return_value = auth

        res = handler.auth(event, context)
        # We should return a 200 response
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["status"], "OK")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_cookie.called_with("mycookie"))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory")
    @patch("handler.make_app")
    def test_auth_cookie_invalid(self, make_app, factory, data_store):
        """Test /auth when a cookie present and an invalid session on a Mastodon
        server"""

        event = {
            "headers": {"origin": "none"},
            "cookies": ["list-manager-cookie=mycookie"],
        }
        context = {}

        mastodon = mock_mastodon()
        mastodon.me.side_effect = MastodonAPIError
        factory.from_cookie.return_value = mastodon
        factory.from_config.return_value = mastodon

        data_store.is_allowed.return_value = True
        auth = MagicMock()
        auth.domain = "mydomain"
        data_store.get_auth.return_value = auth

        res = handler.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_cookie.called_with("mycookie"))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory")
    @patch("handler.make_app")
    def test_auth_cookie_valid_no_hostmatch(self, make_app, factory, data_store):
        """Test /auth when a cookie present but the domain doesn't match the one
        in the cookie"""

        event = {
            "headers": {"origin": "none"},
            "cookies": ["list-manager-cookie=mycookie"],
            "queryStringParameters": {"domain": "anotherdomain"},
        }
        context = {}

        mastodon = mock_mastodon()
        factory.from_cookie.return_value = mastodon
        factory.from_config.return_value = mastodon

        data_store.is_allowed.return_value = True
        auth = MagicMock()
        auth.domain = "mydomain"
        data_store.get_auth.return_value = auth

        res = handler.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_cookie.called_with("mycookie"))
        # We should not have created a new app
        self.assertFalse(make_app.called)
