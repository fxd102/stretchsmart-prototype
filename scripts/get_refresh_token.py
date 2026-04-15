#!/usr/bin/env python3
"""
One-time OAuth helper for StretchSmart.

Run this once on a machine with a browser to produce a refresh token that the
scheduler (GitHub Actions) can use headlessly.

Prerequisites:
  pip install google-auth-oauthlib

Steps:
  1. Download the OAuth client credentials JSON from Google Cloud Console
     (APIs & Services → Credentials → your OAuth 2.0 Client ID → Download)
     and save it in this directory as client_secret.json.
  2. Run: python3 get_refresh_token.py
  3. Your browser will open. Sign in with the Google account whose calendar
     you want StretchSmart to read. Grant read-only calendar access.
  4. The script prints three values. Paste each one into GitHub Secrets:
        https://github.com/fxd102/stretchsmart-prototype/settings/secrets/actions
     as GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.
  5. Delete client_secret.json from your machine when you're done.
"""

import json
import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
CLIENT_SECRET_FILE = Path(__file__).resolve().parent / "client_secret.json"


def main() -> int:
    if not CLIENT_SECRET_FILE.exists():
        print(f"ERROR: {CLIENT_SECRET_FILE} not found.", file=sys.stderr)
        print(
            "Download the OAuth client JSON from Google Cloud Console and "
            "save it in this directory as client_secret.json.",
            file=sys.stderr,
        )
        return 1

    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_FILE), SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

    cs = json.loads(CLIENT_SECRET_FILE.read_text())
    installed = cs.get("installed") or cs.get("web") or {}
    client_id = installed.get("client_id", "")
    client_secret = installed.get("client_secret", "")

    if not creds.refresh_token:
        print(
            "ERROR: no refresh_token returned. Make sure you used an 'offline' "
            "grant (the script does request this). If you've authorized this "
            "app before, revoke access at "
            "https://myaccount.google.com/permissions and try again.",
            file=sys.stderr,
        )
        return 1

    print()
    print("=" * 64)
    print("SUCCESS — paste these into GitHub Secrets:")
    print("https://github.com/fxd102/stretchsmart-prototype/settings/secrets/actions")
    print("=" * 64)
    print()
    print("Secret name: GOOGLE_CLIENT_ID")
    print(client_id)
    print()
    print("Secret name: GOOGLE_CLIENT_SECRET")
    print(client_secret)
    print()
    print("Secret name: GOOGLE_REFRESH_TOKEN")
    print(creds.refresh_token)
    print()
    print("=" * 64)
    print("Don't forget to delete client_secret.json when you're done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
