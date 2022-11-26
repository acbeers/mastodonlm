"""Tests for lambda handler"""

import json
from unittest.mock import MagicMock, patch, sentinel, call, Mock
from unittest import TestCase
import handler

from mastodon import MastodonAPIError, MastodonUnauthorizedError


def mock_userdict(username):
    """Returns a mock user dict"""
    return {
        "id": username,
        "display_name": f"dn-{username}",
        "username": f"{username}",
        "acct": f"act-{username}",
        "note": f"note-{username}",
        "avatar": f"avatar-{username}",
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
        "headers": {"origin": "none"},
        "cookies": ["list-manager-cookie=mycookie"],
    }
    context = {}

    return (event, context)


class TestAuth(TestCase):
    """Tests for /auth methods"""

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory", new_callable=mock_factory)
    @patch("handler.make_app")
    def test_auth_nocookie_newhost(self, make_app, _factory, dataStore):
        """Test /auth when we haven't seen this host before"""

        (event, context) = setupNoCookies()

        dataStore.is_allowed.return_value = True
        dataStore.get_host_config.return_value = None
        make_app.return_value = ("id", "secret")

        res = handler.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        # And, we should call make_app
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have created a new mastodon app
        self.assertTrue(make_app.called)

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory", new_callable=mock_factory)
    @patch("handler.make_app")
    def test_auth_nocookie_knownhost(self, make_app, factory, dataStore):
        """Test /auth when no cookie is present"""

        (event, context) = setupNoCookies()

        dataStore.is_allowed.return_value = True
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
    @patch("handler.MastodonFactory", new_callable=mock_factory)
    @patch("handler.make_app")
    def test_auth_cookie_valid(self, make_app, factory, data_store):
        """Test /auth when a cookie present and a valid session on a Mastodon server"""

        (event, context) = setupWithCookies()

        mastodon = mock_mastodon()
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
    @patch("handler.MastodonFactory", new_callable=mock_factory)
    @patch("handler.make_app")
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

        res = handler.auth(event, context)
        # We should return a 200 response with the correct redirect URL.
        self.assertEqual(res["statusCode"], 200)
        self.assertEqual(json.loads(res["body"])["url"], "https://mock_redirect")
        # We should have made a mastodon instance from the stored config
        self.assertTrue(factory.from_cookie.called_with("mycookie"))
        # We should not have created a new app
        self.assertFalse(make_app.called)

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory", new_callable=mock_factory)
    @patch("handler.make_app")
    def test_auth_cookie_valid_no_hostmatch(self, make_app, factory, data_store):
        """Test /auth when a cookie present but the domain doesn't match the one
        in the cookie"""

        (event, context) = setupNoCookies()
        event["queryStringParameters"] = {"domain": "anotherdomain"}

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


class TestInfo(TestCase):
    """Tests for /info methods"""

    def test_info_nocookie(self):
        """Test /info when a cookie is not present"""

        (event, context) = setupNoCookies()

        res = handler.info(event, context)

        # We should return a 403 response with the correct status info
        self.assertEqual(res["statusCode"], 403)
        self.assertEqual(json.loads(res["body"])["status"], "no_cookie")

    @patch("handler.MastodonFactory", new_callable=mock_factory)
    def test_info_badcookie(self, factory):
        """Test /info when cookie is present but mastodon API throws an error"""

        (event, context) = setupWithCookies()

        # We use Mastodon.me() to ensure someone has logged in.
        factory.from_cookie.return_value.me.side_effect = MastodonUnauthorizedError

        res = handler.info(event, context)

        # We should return a 403 response with the correct status info
        self.assertEqual(res["statusCode"], 403)
        self.assertEqual(json.loads(res["body"])["status"], "no_cookie")

    @patch("handler.Datastore")
    @patch("handler.MastodonFactory", new_callable=mock_factory)
    def test_info(self, factory, data_store):
        """Test /info"""

        (event, context) = setupWithCookies()

        auth = MagicMock()
        auth.domain = "mydomain"
        data_store.get_auth.return_value = auth
        mastomock = factory.from_cookie.return_value
        mastomock.account_following = sentinel.account_following
        mastomock.list_accounts = sentinel.list_accounts

        def get_all_mock(func, *_):
            """Mocks get_all with reasonable return values"""
            if func == sentinel.account_following:
                # Return a list of user dicts
                return [mock_userdict("u1")]
            if func == sentinel.list_accounts:
                # Return a list of user dicts
                return [mock_userdict("u1")]
            return []

        with patch("handler.get_all", new=Mock(wraps=get_all_mock)) as gam:
            res = handler.info(event, context)
            # We should return a 200 response with the correct redirect URL.
            self.assertEqual(res["statusCode"], 200)
            # Make sure the right methods got called to fill this out.
            self.assertEqual(
                [
                    call(sentinel.account_following, "me"),
                    call(sentinel.list_accounts, "listid1"),
                ],
                gam.mock_calls,
            )
