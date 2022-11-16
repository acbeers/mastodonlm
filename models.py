from pynamodb.models import Model
from pynamodb.attributes import UnicodeAttribute, NumberAttribute


class AuthTable(Model):
    """
    A DynamoDB User
    """

    class Meta:
        table_name = "authTable"
        region = "us-west-2"

    key = UnicodeAttribute(hash_key=True)
    token = UnicodeAttribute()
    domain = UnicodeAttribute()
    expires_at = NumberAttribute()

    @classmethod
    def lookup(cls, key):
        res = list(cls.query(key))
        if len(res) == 0:
            return None
        return res[0]
