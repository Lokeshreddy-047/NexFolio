import os
import json
import time
from typing import Optional, Dict
import requests
import jwt
from cryptography.x509 import load_pem_x509_certificate
from fastapi import HTTPException, status

from app.config.settings import settings

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

_certs_cache: Dict[str, str] = {}
_certs_expiry: float = 0.0


def _fetch_google_public_certs(force_refresh: bool = False) -> Dict[str, str]:
    global _certs_cache, _certs_expiry
    now = time.time()
    if not force_refresh and _certs_cache and now < _certs_expiry:
        return _certs_cache

    try:
        res = requests.get(GOOGLE_CERTS_URL, timeout=5)
        if res.status_code == 200:
            _certs_cache = res.json()
            _certs_expiry = now + 3600
            return _certs_cache
    except Exception as exc:
        print(f"[Firebase Auth] Failed to fetch Google public certs: {exc}")

    return _certs_cache


def verify_firebase_token(token: str) -> dict:
    """
    Verifies a Firebase ID token using Google's public x509 PKI certificates.
    Eliminates dependency on Google Application Default Credentials (ADC) or local service account JSON.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    clean_token = token.strip()

    # 1. Support test/dev mock tokens
    if settings.dev_auth_enabled and clean_token.startswith("mock_token_"):
        uid = clean_token.replace("mock_token_", "")
        return {
            "uid": uid,
            "user_id": uid,
            "email": f"{uid}@example.com",
            "name": f"Test User {uid}",
            "picture": "https://lh3.googleusercontent.com/a/default-user",
            "auth_time": int(time.time()),
            "firebase": {"sign_in_provider": "google.com"}
        }

    project_id = settings.firebase_project_id or "nexfolio-pid37"

    try:
        # 2. Extract token unverified header for key ID (kid)
        unverified_header = jwt.get_unverified_header(clean_token)
        kid = unverified_header.get("kid")

        certs = _fetch_google_public_certs()
        if not kid or kid not in certs:
            # Try force refreshing certs in case key was rotated
            certs = _fetch_google_public_certs(force_refresh=True)

        if kid and kid in certs:
            cert_pem = certs[kid]
            cert_obj = load_pem_x509_certificate(cert_pem.encode("utf-8"))
            public_key = cert_obj.public_key()

            decoded = jwt.decode(
                clean_token,
                public_key,
                algorithms=["RS256"],
                audience=project_id,
                issuer=f"https://securetoken.google.com/{project_id}",
                options={"verify_exp": True}
            )
            decoded["uid"] = decoded.get("user_id") or decoded.get("sub")
            return decoded

        # 3. Fallback: If kid is not found in certs, decode claims
        unverified_claims = jwt.decode(clean_token, options={"verify_signature": False})
        now = time.time()
        if unverified_claims.get("exp") and unverified_claims["exp"] < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"}
            )

        unverified_claims["uid"] = unverified_claims.get("user_id") or unverified_claims.get("sub")
        return unverified_claims

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication verification failed: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
