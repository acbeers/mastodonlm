"""Utility functions"""

import json
import logging


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


def cleandomain(domain):
    """Clean up a domain input - all lowercase, no @"""
    if domain is None:
        return domain

    return domain.strip().lower().replace("@", "")
