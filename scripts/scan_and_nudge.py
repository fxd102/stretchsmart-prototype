#!/usr/bin/env python3
"""
StretchSmart nudge scanner.

Runs on GitHub Actions cron. Reads Faith's Google Calendar, finds the
current gap in her day, decides whether it is nudge time, and if so
posts a message to the Discord webhook. Persists fire history under
state/ so the next run can enforce frequency limits.

Required env vars:
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REFRESH_TOKEN
  DISCORD_WEBHOOK_URL

Optional env vars:
  TZ                  (default: America/New_York)
  NUDGE_WINDOW_START  (default: 8   — hour of day, 24h, local tz)
  NUDGE_WINDOW_END    (default: 18)
  MAX_NUDGES_PER_DAY  (default: 4)
  MIN_GAP_MINUTES     (default: 15)
  MIN_HOURS_BETWEEN   (default: 2)
  SITE_BASE_URL       (default: https://fxd102.github.io/stretchsmart-prototype)
  DRY_RUN             (if non-empty, do not post to Discord or write state)
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from urllib import request as urlreq
from zoneinfo import ZoneInfo

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TZ_NAME = os.environ.get("TZ", "America/New_York")
TZ = ZoneInfo(TZ_NAME)
NUDGE_START_HR = int(os.environ.get("NUDGE_WINDOW_START", "8"))
NUDGE_END_HR = int(os.environ.get("NUDGE_WINDOW_END", "18"))
MAX_NUDGES = int(os.environ.get("MAX_NUDGES_PER_DAY", "4"))
MIN_GAP_MIN = int(os.environ.get("MIN_GAP_MINUTES", "15"))
MIN_HRS_BETWEEN = float(os.environ.get("MIN_HOURS_BETWEEN", "2"))
SITE_BASE = os.environ.get(
    "SITE_BASE_URL", "https://fxd102.github.io/stretchsmart-prototype"
)
DRY_RUN = bool(os.environ.get("DRY_RUN"))

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = REPO_ROOT / "state" / "nudges.json"
EXERCISES_PATH = REPO_ROOT / "api" / "exercises.json"


def log(msg: str) -> None:
    print(f"[nudge] {msg}", flush=True)


def build_calendar_service():
    creds = Credentials(
        token=None,
        refresh_token=os.environ["GOOGLE_REFRESH_TOKEN"],
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/calendar.readonly"],
    )
    creds.refresh(Request())
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def window_bounds(now_tz: datetime) -> tuple[datetime, datetime]:
    start = now_tz.replace(hour=NUDGE_START_HR, minute=0, second=0, microsecond=0)
    end = now_tz.replace(hour=NUDGE_END_HR, minute=0, second=0, microsecond=0)
    return start, end


def get_events_today(service, now: datetime) -> list[dict]:
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=day_start.isoformat(),
            timeMax=day_end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )
    events = []
    for ev in result.get("items", []):
        s_dt = ev.get("start", {}).get("dateTime")
        e_dt = ev.get("end", {}).get("dateTime")
        if not s_dt or not e_dt:
            # Skip all-day events (date, not dateTime).
            continue
        if ev.get("transparency") == "transparent":
            # "Free" events don't block gaps.
            continue
        if ev.get("status") == "cancelled":
            continue
        events.append(
            {
                "summary": ev.get("summary", "(untitled)"),
                "start": datetime.fromisoformat(s_dt).astimezone(TZ),
                "end": datetime.fromisoformat(e_dt).astimezone(TZ),
            }
        )
    return events


def find_current_gap(events: list[dict], now: datetime) -> tuple[datetime, int] | None:
    """Return (gap_end, minutes_remaining_in_gap) or None if not in a gap."""
    window_start, window_end = window_bounds(now)
    if now < window_start or now >= window_end:
        return None

    relevant = [
        e for e in events if e["end"] > window_start and e["start"] < window_end
    ]

    # Are we inside an event right now?
    for e in relevant:
        if e["start"] <= now < e["end"]:
            return None

    # Gap ends at the next event start, or at the window end, whichever is earlier.
    next_starts = [e["start"] for e in relevant if e["start"] > now]
    gap_end = min(next_starts) if next_starts else window_end
    gap_end = min(gap_end, window_end)
    minutes_remaining = int((gap_end - now).total_seconds() / 60)
    return (gap_end, minutes_remaining)


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {"fired": []}
    try:
        return json.loads(STATE_PATH.read_text())
    except Exception:
        log("state file corrupt, starting fresh")
        return {"fired": []}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2, default=str) + "\n")


def prune_state(state: dict, now: datetime) -> dict:
    cutoff = (now - timedelta(days=14)).date().isoformat()
    state["fired"] = [f for f in state.get("fired", []) if f.get("date", "") >= cutoff]
    return state


def fires_today(state: dict, now: datetime) -> list[dict]:
    today = now.date().isoformat()
    return [f for f in state.get("fired", []) if f.get("date") == today]


def should_fire(
    state: dict, now: datetime, minutes_remaining: int
) -> tuple[bool, str]:
    if minutes_remaining < MIN_GAP_MIN:
        return False, f"gap too short ({minutes_remaining} < {MIN_GAP_MIN} min)"
    todays = fires_today(state, now)
    if len(todays) >= MAX_NUDGES:
        return False, f"already fired {len(todays)}/{MAX_NUDGES} today"
    if todays:
        last_dt = datetime.fromisoformat(todays[-1]["time"])
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=TZ)
        gap_hours = (now - last_dt).total_seconds() / 3600
        if gap_hours < MIN_HRS_BETWEEN:
            return False, f"last fire {gap_hours:.2f}h ago < {MIN_HRS_BETWEEN}h"
    return True, "ok"


def pick_exercise(now: datetime) -> tuple[int | None, dict | None]:
    exercises = json.loads(EXERCISES_PATH.read_text())
    if not exercises:
        return None, None
    idx = now.toordinal() % len(exercises)
    return idx, exercises[idx]


def post_discord(
    webhook_url: str, exercise: dict, exercise_idx: int, now: datetime
) -> bool:
    time_str = now.strftime("%-I:%M %p")
    nudge_url = f"{SITE_BASE}/v2/nudge.html?e={exercise_idx}"
    dur = exercise.get("duration") or sum(
        p.get("seconds", 0) for p in exercise.get("phases", [])
    )
    content = (
        f"**StretchSmart** — {time_str}\n"
        f"**{exercise['name']}** · {dur}s\n"
        f"{exercise.get('desc', '')}\n"
        f"→ {nudge_url}"
    )
    if DRY_RUN:
        log(f"[DRY_RUN] would post:\n{content}")
        return True
    req = urlreq.Request(
        webhook_url,
        data=json.dumps({"content": content}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "StretchSmart/1.0 (+https://fxd102.github.io/stretchsmart-prototype)",
        },
        method="POST",
    )
    try:
        with urlreq.urlopen(req, timeout=15) as resp:
            return 200 <= resp.status < 300
    except Exception as e:
        log(f"discord post failed: {e}")
        return False


def main() -> int:
    now = datetime.now(TZ)
    log(f"now={now.isoformat()} tz={TZ_NAME}")

    required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "DISCORD_WEBHOOK_URL"]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        log(f"secrets not configured yet: {', '.join(missing)} — skipping")
        return 0

    window_start, window_end = window_bounds(now)
    if now < window_start or now >= window_end:
        log(f"outside nudge window ({NUDGE_START_HR}-{NUDGE_END_HR})")
        return 0

    state = prune_state(load_state(), now)

    try:
        service = build_calendar_service()
        events = get_events_today(service, now)
    except Exception as e:
        log(f"calendar error: {e}")
        return 1

    log(f"events today: {len(events)}")
    gap = find_current_gap(events, now)
    if gap is None:
        log("currently inside an event or outside window")
        if not DRY_RUN:
            save_state(state)
        return 0

    gap_end, minutes_remaining = gap
    log(f"in gap until {gap_end.isoformat()} ({minutes_remaining} min left)")

    ok, why = should_fire(state, now, minutes_remaining)
    if not ok:
        log(f"not firing: {why}")
        if not DRY_RUN:
            save_state(state)
        return 0

    idx, exercise = pick_exercise(now)
    if exercise is None:
        log("no exercises available")
        return 1

    log(f"firing: {exercise['name']}")
    if not post_discord(os.environ["DISCORD_WEBHOOK_URL"], exercise, idx, now):
        log("post failed — not updating state")
        return 1

    state.setdefault("fired", []).append(
        {
            "date": now.date().isoformat(),
            "time": now.isoformat(),
            "exercise": exercise["name"],
            "exercise_index": idx,
        }
    )
    if not DRY_RUN:
        save_state(state)
    log("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
