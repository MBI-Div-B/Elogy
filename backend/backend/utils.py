from datetime import datetime
from dateutil.parser import parse
from flask_restful import reqparse
from flask import request, current_app
from flask.json import JSONEncoder
import peewee
import requests
import sys
from playhouse.shortcuts import model_to_dict


def has_access(user_group="", logbook_id=None):
    """
    Determines if the user making the current request belongs to the given user_group, either by providing the user_group directly,
    or by giving the id of the logbook for which the user_group should be checked
    Returns True if 
        1) user_group is not defined (implying the logbook has no group lock), OR
        2) if the jwt can be properly decoded by the jwt-auth service, and its group list includes user_group
    """
    from .db import Logbook
    if not logbook_id is None:
        user_group = Logbook.get(Logbook.id == logbook_id).user_group
    if not user_group:
        return True
    
    parser = reqparse.RequestParser()
    parser.add_argument('jwt', location='cookies')
    args = parser.parse_args()
    jwt = args["jwt"]
    if not jwt:
        return False

    r = requests.post(
        url=current_app.config["JWT_DECODE_URL"], data={"jwt": jwt})

    if r.status_code is not 200:
        print("Error status code: " + str(r.status_code), file=sys.stdout)
        return False
    else:
        data = r.json()
        return user_group in data["groups"]


def request_wants_json():
    "Check whether we should send a JSON reply"
    best = request.accept_mimetypes \
        .best_match(['application/json', 'text/html'])
    print(best)
    print(request.accept_mimetypes[best],
          request.accept_mimetypes['text/html'])

    return best == 'application/json' and \
        request.accept_mimetypes[best] >= \
        request.accept_mimetypes['text/html']


class CustomJSONEncoder(JSONEncoder):

    """JSON serializer for objects not serializable by default json code"""

    def default(self, obj):
        if isinstance(obj, datetime):
            serial = obj.timestamp()
            return serial
        elif isinstance(obj, peewee.SelectQuery):
            print("select")
            return list(obj)
        elif isinstance(obj, peewee.Model):
            serial = model_to_dict(obj, recurse=False)
            return serial

        return JSONEncoder.default(self, obj)


def get_utc_datetime(datestring):
    timestamp = parse(datestring)
    # we want to store UTC since SQLite does not store the TZ
    # information.
    utc_offset = timestamp.utcoffset()
    if utc_offset:
        timestamp -= utc_offset
    # turn our timestamp into a "naive" datetime object
    return timestamp.replace(tzinfo=None)
