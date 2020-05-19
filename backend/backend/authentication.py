from .db import Logbook
import requests
from flask import current_app
from flask_restful import reqparse
import sys


def login(username, password):
    """
    Performs username/password autentication against the API endpoint JWT_AUTH_URL. In the case of max iv the authentication
    service returns a JSON object with the following data:
    {
    "jwt": String //a jwt token. The following data is the content of the payload of this token
    "username": String,
    "groups": String[], //the groups the user belongs to
    "phone": String,
    "email": String, 
    "name": String, //Full name
    "iat": number, //Issuing time
    "exp": number, //Exp time
}
    Most of this data is used in elogy:
    jwt - stored as a cookie. used by the backend to authenticate requests to restricted logbooks
    username - saved to logbook.owner if creating a logbook while logged in. Used to determine if a user can see the "visiblity"
        drop-down when editing a logbook
    groups - is listed in the "visibility" dropdown when editing a logbook. Stored in logbook.user_group, which is used to determine
        if a user has access to a logbook
    phone - not used
    email - not used
    name - displayed in the top left corner of elogy after logging in
    ait - not used
    exp - used to determine if the jwt token is still valid. In the front-end it's validated whenever the component Elogy is mounted.
        In the backend it is validated whenever access to a restricted logbook  is requested.
    """

    r = requests.post(
        url=current_app.config["JWT_AUTH_URL"], data={"username": username, "password": password,  "includeDecoded": True})

    if r.status_code is not 200:
        print("Error status code: " + str(r.status_code), file=sys.stdout)
        raise Exception()
    else:
        data = r.json()
        return data


def get_user():
    """ Returns the currently logged in user or an empty string. Does this by decoding jwt (externally), and then returning its username attribute"""
    parser = reqparse.RequestParser()
    parser.add_argument('jwt', location='cookies')
    args = parser.parse_args()
    jwt = args["jwt"]
    if not jwt:
        return ""

    r = requests.post(
        url=current_app.config["JWT_DECODE_URL"], data={"jwt": jwt})

    if r.status_code is not 200:
        print("Error status code: " + str(r.status_code), file=sys.stdout)
        return ""
    else:
        data = r.json()
        return data["username"]


def has_access(user_group="", logbook_id=None):
    """
    Determines if the user making the current request belongs to the given user_group, either by providing the user_group directly,
    or by giving the id of the logbook for which the user_group should be checked
    Returns True if 
        1) user_group is not defined (implying the logbook has no group lock), OR
        2) if the jwt can be properly decoded by the auth service, and its group list includes user_group
    """

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
