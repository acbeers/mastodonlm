"""Telemetry functions for Mastodon List Manager"""

import json
import logging

# AWS doens't set a logging level, so set it here.
logging.getLogger("root").setLevel(logging.INFO)
# But don't log much from botocore
logging.getLogger("botocore").setLevel(logging.ERROR)


def ok_response():
    return {
        "statusCode": 200,
        "body": json.dumps({"status":"OK"}),
    }



def telemetry(event,_):
    """Log a telemetry event"""

    # Basically log everything that we got.
    logging.info(event["body"])
    return ok_response()

def error(event,_):
    # Basically log everything that we got.
    logging.error(event["body"])
    return ok_response()
