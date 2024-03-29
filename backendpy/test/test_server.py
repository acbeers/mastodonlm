"""Tests for lambda handler"""

import json
import logging
import os
from unittest.mock import MagicMock, patch, sentinel
from unittest import TestCase
from mastodon import MastodonAPIError
import server
import shared

# Here, reconfigure the logger to send output to a file during tests.
logging.basicConfig(level=logging.INFO, filename="debug_log.txt")


def mock_userdict(username):
    """Returns a mock user dict"""
    return {
        "id": username,
        "display_name": f"dn-{username}",
        "username": f"{username}",
        "acct": f"act-{username}",
        "note": f"note-{username}",
        "avatar": f"avatar-{username}",
        "following_count": 100,
    }


def mock_listdict(listid):
    """Returns a mock list dict"""
    return {"id": listid, "title": f"title-{listid}"}


def mock_mastodon():
    """Returns a mock fo the Mastodon object"""
    res = MagicMock()
    res.auth_request_url.return_value = "https://mock_redirect"
    res.lists.return_value = [mock_listdict("listid1")]
    res.me.return_value = mock_userdict("me")
    return res


def mock_factory():
    """Returns a mock Mastondon Factory with reasonsable defaults"""

    factory = MagicMock()
    mastodon = mock_mastodon()
    factory.from_config.return_value = mastodon
    factory.from_cookie.return_value = mastodon
    return factory


def setupNoCookies():
    """Returns event and context objects for tests with no cookies"""

    event = {"headers": {"origin": "none"}}
    context = {}

    return (event, context)


def setupWithCookies():
    """Returns event and context objects for tests with with a cookie"""

    event = {
        "headers": {"origin": "none", "authorization": "mycookie"},
    }
    context = {}

    return (event, context)


class TestAuth(TestCase):
    """Tests for /auth methods"""

    def test_auth_nodomain(self):
        """Test /auth with no domain parameter - there's little we can do!"""
        (event, context) = setupNoCookies()

        res = shared.auth(event, context)
        # We should return a 401 response
        self.assertEqual(res["statusCode"], 500)
        self.assertEqual(json.loads(res["body"])["status"], "bad_host")

    @patch("shared.Datastore")
    @patch("shared.MastodonFactory", new_callable=mock_factory)
    @patch("shared.make_app")
    def test_auth_nocookie_newhost(self, make_app, _factory, dataStore):
        """Test /auth when we haven't seen this host before"""

        (event, context) = setupNoCookies()
        event["queryStringParameters"] = {"domain": "mydomain"}

        dataStore.is_allowed.return_value = True
        dataStore.get_host_config.return_value = None
        make_app.return_value = ("id", "secret")

        res = shared.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        # And, we should call make_app
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have created a new mastodon app
        self.assertTrue(make_app.called)

    @patch("shared.Datastore")
    @patch("shared.MastodonFactory", new_callable=mock_factory)
    @patch("shared.make_app")
    def test_auth_nocookie_knownhost(self, make_app, factory, dataStore):
        """Test /auth when no cookie is present"""

        (event, context) = setupNoCookies()
        event["queryStringParameters"] = {"domain": "mydomain"}

        dataStore.is_allowed.return_value = True
        dataStore.get_host_config.return_value = sentinel.host_cfg

        res = shared.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_config.called_with(sentinel.host_cfg))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    @patch("shared.Datastore")
    @patch("shared.MastodonFactory", new_callable=mock_factory)
    @patch("shared.make_app")
    def test_auth_cookie_valid(self, make_app, factory, data_store):
        """Test /auth when a cookie present and a valid session on a Mastodon server"""

        (event, context) = setupWithCookies()

        data_store.is_allowed.return_value = True
        auth = MagicMock()
        auth.domain = "mydomain"
        data_store.get_auth.return_value = auth

        res = shared.auth(event, context)
        # We should return a 200 response
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["status"], "OK")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_cookie.called_with("mycookie"))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    @patch("shared.Datastore")
    @patch("shared.MastodonFactory", new_callable=mock_factory)
    @patch("shared.make_app")
    def test_auth_cookie_unknown(self, make_app, factory, data_store):
        """Test /auth when a cookie present but it is unknown to us"""

        (event, context) = setupWithCookies()

        # Make the me() method throw, which is how we know we aren't logged in.
        factory.from_cookie.return_value.me.side_effect = shared.NoAuthInfo

        data_store.is_allowed.return_value = True

        res = shared.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_cookie.called_with("mycookie"))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    @patch("shared.Datastore")
    @patch("shared.MastodonFactory", new_callable=mock_factory)
    @patch("shared.make_app")
    def test_auth_cookie_invalid(self, make_app, factory, data_store):
        """Test /auth when a cookie present and an invalid session on a Mastodon
        server"""

        (event, context) = setupWithCookies()

        # Make the me() method throw, which is how we know we aren't logged in.
        factory.from_cookie.return_value.me.side_effect = MastodonAPIError

        data_store.is_allowed.return_value = True
        auth = MagicMock()
        auth.domain = "mydomain"
        data_store.get_auth.return_value = auth

        res = shared.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_cookie.called_with("mycookie"))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    @patch("shared.Datastore")
    @patch("shared.MastodonFactory", new_callable=mock_factory)
    @patch("shared.make_app")
    def test_auth_cookie_valid_no_hostmatch(self, make_app, factory, data_store):
        """Test /auth when a cookie present but the domain doesn't match the one
        in the cookie"""

        (event, context) = setupNoCookies()
        event["queryStringParameters"] = {"domain": "anotherdomain"}

        data_store.is_allowed.return_value = True
        auth = MagicMock()
        auth.domain = "mydomain"
        data_store.get_auth.return_value = auth

        res = shared.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_cookie.called_with("mycookie"))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    # Test auth with URL instead of a domain
    @patch("shared.Datastore")
    @patch("shared.MastodonFactory", new_callable=mock_factory)
    @patch("shared.make_app")
    @patch.dict(os.environ, {"AUTH_REDIRECT": "https://test_redirect"})
    def test_auth_nocookie_urlhost(self, make_app, _factory, dataStore):
        """Test /auth when we haven't seen this host before"""

        (event, context) = setupNoCookies()
        event["queryStringParameters"] = {"domain": "https://mydomain"}

        dataStore.is_allowed.return_value = True
        dataStore.get_host_config.return_value = None
        make_app.return_value = ("id", "secret")

        res = shared.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        # And, we should call make_app
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have created a new mastodon app
        make_app.assert_called_with(
            "mydomain", "https://test_redirect/callback?domain=mydomain"
        )

    @patch("server.Datastore")
    @patch("server.MastodonFactory", new_callable=mock_factory)
    def test_logout(self, factory, data_store):
        """Test /logout"""

        (event, context) = setupWithCookies()

        mastomock = factory.from_cookie.return_value

        server.logout(event, context)
        # We should have made a mastodon instance from the stored config
        factory.from_cookie.assert_called_with("mycookie")
        # We should drop the access token
        self.assertTrue(mastomock.revoke_access_token.called)
        # We should drop the auth from dynamodb
        self.assertTrue(data_store.drop_auth.called_with("mycookie"))


class TestMakeApp(TestCase):
    """Tests for make_app"""

    @patch("shared.Mastodon.create_app", return_value=("id", "secret"))
    def test_makeapp_agent(self, create_app):
        """make_app must be called with a session object that includes a user-agent header"""
        shared.make_app("domain", "https://redirect_url")
        self.assertTrue("session" in create_app.call_args.kwargs)
        self.assertTrue("User-Agent" in create_app.call_args.kwargs["session"].headers)
