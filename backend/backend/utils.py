from datetime import datetime
from dateutil.parser import parse
from flask import request, current_app
from flask.json import JSONEncoder
import peewee
import requests
import sys
from flask_restful import reqparse
from playhouse.shortcuts import model_to_dict

def get_user_groups(as_sql_list=False):
    """
    Returns the user groups the requesting user belongs to, or an empty list if no or an invalid jwt token is found
    If as_sql_list, returns a string on the format 
    ('g_1', 'g_2', ... 'g_n') to be used directly in a sql query
    """
    try:
        parser = reqparse.RequestParser()
        parser.add_argument('jwt', location='cookies')
        args = parser.parse_args()
        jwt = args["jwt"]
        if not jwt:
            if as_sql_list:
                return "('')" 
            return []
        r = requests.post(
            url=current_app.config["JWT_DECODE_URL"], data={"jwt": jwt})

        if r.status_code is not 200:
            if as_sql_list:
                return "('')"
            return []

        data = r.json()
        if not as_sql_list:
            return data["groups"]
        return "('', '" + "', '".join(data["groups"]) + "')"
    except Exception:
        if as_sql_list:
            return "('')"
        return []
    

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
