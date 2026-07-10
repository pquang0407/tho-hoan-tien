import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

db = None

try:
    firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS")
    if firebase_creds_json:
        creds_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase connected successfully via Env Var!")
    else:
        cred = credentials.Certificate(
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase-key.json")
        )
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase connected successfully via Local File!")
except Exception as e:
    print(f"Firebase initialization error: {e}")
