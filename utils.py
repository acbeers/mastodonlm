"""Utility functions"""

import json
import logging
import re


def get_cookie(event):
    """Retrieves the auth cookie from the event object"""
    headers = event.get("headers", {})
    cookie = headers.get("authorization", None)
    return cookie


def response(body, statusCode=200):
    """Construct a lambda response object"""
    # Log a mesasge for error-like things.
    if statusCode >= 404:
        logging.error("Returning %s with %s", statusCode, body)
    elif statusCode >= 400:
        logging.info("Returning %s with %s", statusCode, body)
    return {
        "statusCode": statusCode,
        "body": body,
    }


def err_response(msg):
    """Construct a lambda error response"""
    obj = {"status": msg}
    return response(json.dumps(obj), statusCode=500)


def blocked_response():
    """Returns a 'blocked' response"""
    return err_response("blocked")


def badhost_response(host):
    """Returns a "bad_host" response"""

    obj = {"status": "bad_host", "host": host}
    return response(json.dumps(obj), statusCode=500)


def cleandomain(domain):
    """Clean up a domain input - all lowercase, no @"""
    if domain is None:
        return domain

    # Clean up some common problems:
    # - https://domain
    # - username@domain

    ldomain = domain.lower()

    # The URL case
    m = re.match("https://([^/]*)", ldomain)
    if m is not None:
        return m.group(1)

    # The username case
    m = re.match("([^@]*)@([a-zA-Z0-9_.-]*)", ldomain)
    if m is not None:
        return m.group(2)

    # Otherwise, just get rid of garbage.
    return re.sub("[^a-zA-Z0-9_.-]", "", ldomain)
    # return domain.strip().lower().replace("@", "")
