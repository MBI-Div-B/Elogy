from flask import request, send_file
from flask_restful import Resource, marshal, marshal_with, abort
from webargs.fields import (Integer, Str, Boolean, Dict, List,
                            Nested, Email, LocalDateTime)
from webargs.flaskparser import use_args
from ..authentication import login

class AuthResource(Resource):

    "Handles user authentication"

    @use_args({"username": Str(), "password": Str()})
    def post(self, args):
        try:
            return login(args["username"], args["password"])
        except Exception:
            abort(401, message=("Login failed"))
