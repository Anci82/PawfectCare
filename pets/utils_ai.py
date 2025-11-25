# utils_ai.py
from typing import List, Dict

SERIOUS_NOTE_KEYWORDS = [
    "vomit", "vomiting", "throwing up", "diarrhea", "diarrhoea",
    "not eating", "won't eat", "wont eat", "refusing food", "no food",
    "lethargic", "very quiet", "collapse", "collapsed",
    "swollen", "swelling", "smelly", "smell", "odour", "odor",
    "pus", "ooze", "oozing", "bleeding", "blood", "hot to touch",
    "very red", "red and hot", "open wound", "stitches open",
]

MILD_NOTE_KEYWORDS = [
    "a bit tired", "sleepy", "slightly red", "licking", "more sleepy",
    "soft stool", "loose stool",
]


def _safe_lower(val):
    return val.lower() if isinstance(val, str) else ""


def _parse_food(val):
    """
    Convert food value (string or int) to int 0–100, or None.
    Handles things like: 100, "100", "100%", " 75 %", "50 (half)".
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return int(val)

    s = str(val)
    # keep only digits, e.g. "100%" -> "100"
    digits = "".join(ch for ch in s if ch.isdigit())
    if not digits:
        return None

    try:
        return int(digits)
    except ValueError:
        return None



def compute_recovery_flags(logs: List[Dict]) -> Dict[str, str]:
    """
    logs are coming from the frontend in this shape:
      {
        "id": ...,
        "date": "2025-11-24",
        "food": "100" or 100,
        "energy": "high" | "medium" | "low",
        "notes": "...",
        "meds": [...],
        "photo": "url" or null
      }

    Returns:
      {
        "red_flag_level": "low" | "medium" | "high",
        "rule_summary_text": "...",
        "recent_logs_text": "..."
      }
    """
    if not logs:
        return {
            "red_flag_level": "low",
            "rule_summary_text": "No logs were provided.",
            "recent_logs_text": "No logs available.",
        }

    # 🐾 Assume logs are in the same order as JS (oldest first, newest last)
    # Take up to the last 3 as "recent", and view them newest-first
    recent = logs[-3:]
    recent_newest_first = list(reversed(recent))

    food_values = []
    notes_list = []
    # For streaks, we walk from newest → older
    food_very_low_streak = 0   # how many newest logs in a row have food <= 25
    energy_low_streak = 0      # how many newest logs in a row have energy = low

    last_food = None

    for idx, log in enumerate(recent_newest_first):
        food = _parse_food(log.get("food"))
        energy = _safe_lower(log.get("energy"))
        notes = _safe_lower(log.get("notes") or "")

        notes_list.append(notes)
        if food is not None:
            food_values.append(food)
            if idx == 0:
                last_food = food

        # streaks
        if idx == 0:
            # first (newest) log: start streaks based on this
            if food is not None and food <= 25:
                food_very_low_streak = 1
            if energy == "low":
                energy_low_streak = 1
        else:
            # continue streaks only if previous were already "in streak"
            if food_very_low_streak == idx and food is not None and food <= 25:
                food_very_low_streak += 1
            if energy_low_streak == idx and energy == "low":
                energy_low_streak += 1

    avg_food = sum(food_values) / len(food_values) if food_values else None

    # Notes keyword checks
    has_serious_keyword = any(
        any(k in note for k in SERIOUS_NOTE_KEYWORDS) for note in notes_list
    )
    has_mild_keyword = (not has_serious_keyword) and any(
        any(k in note for k in MILD_NOTE_KEYWORDS) for note in notes_list
    )

    # Decide red_flag_level
    reasons = []

    if last_food is not None and last_food == 0:
        reasons.append("Latest log shows 0% food intake.")
    if food_very_low_streak >= 2:
        reasons.append("Last two or more logs show very low food intake (≤ 25%).")
    if avg_food is not None and avg_food < 50:
        reasons.append("Average food intake over recent logs is below 50%.")

    if energy_low_streak >= 2:
        reasons.append("Energy has been low in at least the last two logs.")
    elif energy_low_streak == 1:
        reasons.append("Latest log shows low energy.")

    if has_serious_keyword:
        reasons.append("Notes mention potentially serious symptoms.")
    elif has_mild_keyword:
        reasons.append("Notes mention mild or moderate concerns.")

    strong_food_issue = (
        (last_food is not None and last_food == 0) or food_very_low_streak >= 2
    )
    strong_energy_issue = energy_low_streak >= 2

    if has_serious_keyword or (strong_food_issue and strong_energy_issue):
        red_flag_level = "high"
    elif (
        strong_food_issue
        or strong_energy_issue
        or has_mild_keyword
        or (avg_food is not None and avg_food < 50)
    ):
        red_flag_level = "medium"
    else:
        red_flag_level = "low"

    # Make a human-readable summary of the recent logs (newest first)
    lines = []
    for log in recent_newest_first:
        date = log.get("date") or "Unknown date"
        food_val = _parse_food(log.get("food"))
        energy = log.get("energy") or "unknown"
        notes = log.get("notes") or ""
        lines.append(
            f"- {date}: food {food_val if food_val is not None else 'n/a'}%, "
            f"energy {energy}, notes: {notes[:120]}{'...' if len(notes) > 120 else ''}"
        )

    recent_logs_text = "\n".join(lines)

    if not reasons:
        rule_summary_text = (
            "The rule-based check did not find strong warning patterns in the last few logs. "
            "This does NOT replace a vet's opinion."
        )
    else:
        rule_summary_text = "Rule-based check noticed:\n" + "\n".join(f"- {r}" for r in reasons)

    return {
        "red_flag_level": red_flag_level,
        "rule_summary_text": rule_summary_text,
        "recent_logs_text": recent_logs_text,
    }
