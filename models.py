"""Models for DynamoDB access"""

from pynamodb.models import Model
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

        table_name = "authTable"
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

        table_name = "allowedHosts"
        region = "us-west-2"

    host = UnicodeAttribute(hash_key=True)


class HostConfig(MyModel):
    """
    A list of allowed hosts
    """

    class Meta:
        """Metadata for this table"""

        table_name = "hostsTable"
        region = "us-west-2"

    host = UnicodeAttribute(hash_key=True)
    client_id = UnicodeAttribute()
    client_secret = UnicodeAttribute()
