"""Tests for Datastore interface"""

from unittest.mock import patch
from unittest import TestCase
from models import Datastore


class TestDatastore(TestCase):
    """Tests for MastodonFactory methods"""

    @patch("models.AuthTable")
    def test_getauth(self, authmock):
        """Test for Datastore.get_auth"""

        Datastore.get_auth("cookie")
        authmock.lookup.assert_called_with("cookie")

    @patch("models.HostConfig")
    def test_gethostconfig(self, hostmock):
        """Test for Datastore.get_host_config"""

        Datastore.get_host_config("host")
        hostmock.lookup.assert_called_with("host")

    @patch("models.AllowedHost")
    def test_allowed(self, allowmock):
        """Test for allowed hosts"""
        res = Datastore.is_allowed("host")
        allowmock.lookup.assert_called_with("host")
        self.assertTrue(res)

    @patch("models.AllowedHost")
    @patch("models.BlockedHost")
    def test_blocked(self, blockmock, allowmock):
        """Test for blocked hosts"""
        allowmock.lookup.return_value = None
        res = Datastore.is_allowed("host")
        allowmock.lookup.assert_called_with("host")
        blockmock.lookup.assert_called_with(
            "4740ae6347b0172c01254ff55bae5aff5199f4446e7f6d643d40185b3f475145"
        )
        self.assertFalse(res)

    @patch("models.AllowedHost")
    @patch("models.BlockedHost")
    def test_not_blocked(self, blockmock, allowmock):
        """Test for hosts neither allowed nor blocked"""
        allowmock.lookup.return_value = None
        blockmock.lookup.return_value = None
        res = Datastore.is_allowed("host")
        allowmock.lookup.assert_called_with("host")
        blockmock.lookup.assert_called_with(
            "4740ae6347b0172c01254ff55bae5aff5199f4446e7f6d643d40185b3f475145"
        )
        self.assertTrue(res)
