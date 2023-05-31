"""Telemetry functions for Mastodon List Manager"""

import json
import logging

from smap import map_stacktrace

# AWS doens't set a logging level, so set it here.
logging.getLogger("root").setLevel(logging.INFO)
# But don't log much from botocore
logging.getLogger("botocore").setLevel(logging.ERROR)


def ok_response():
    """Return an OK response"""
    return {
        "statusCode": 200,
        "body": json.dumps({"status": "OK"}),
    }


def telemetry(event, _):
    """Log a telemetry event"""

    # Basically log everything that we got.
    logging.info(event["body"])
    return ok_response()


def error(event, _):
    """Log an error event"""
    # Basically log everything that we got.
    data = json.loads(event["body"])
    if "stack" in data:
        frames = map_stacktrace(data["stack"])
        if len(frames) > 0:
            data["stack"] = "\n".join(frames)
    logging.error(json.dumps(data))
    return ok_response()
