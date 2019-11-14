from .db import Logbook
import requests
from flask import current_app
from flask_restful import reqparse

def has_access(user_group="", logbook_id=None):
    """
    Determines if the user making the current request belongs to the given user_group, either by providing the user_group directly,
    or by giving the id of the logbook for which the user_group should be checked
    Returns True if 
        1) user_group is not defined (implying the logbook has no group lock), OR
        2) if the jwt can be properly decoded by the jwt-auth service, and its group list includes user_group
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
