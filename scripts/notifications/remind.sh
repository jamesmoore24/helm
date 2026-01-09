#!/bin/bash
# =============================================================================
# ONE-OFF REMINDER - Send a notification via ntfy.sh
# =============================================================================
# Usage:
#   ./remind.sh "message"                     # Send immediately
#   ./remind.sh "message" --at "3:00 PM"      # Schedule for time
#   ./remind.sh "message" --in "30 minutes"   # Schedule relative
#
# Times are interpreted using the TIMEZONE setting below
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ============ CONFIG - CUSTOMIZE THESE ============
NTFY_SERVER="https://ntfy.sh"
NTFY_TOPIC="your-topic-here"  # <-- CHANGE THIS: unique topic name
TIMEZONE="America/Los_Angeles"  # <-- CHANGE THIS: your timezone
# ==================================================

# Parse arguments
MESSAGE=""
SCHEDULE_TYPE=""
SCHEDULE_TIME=""
PRIORITY="default"
TAGS="bell"
TITLE="Reminder"

while [[ $# -gt 0 ]]; do
  case $1 in
    --at)       SCHEDULE_TYPE="at"; SCHEDULE_TIME="$2"; shift 2 ;;
    --in)       SCHEDULE_TYPE="in"; SCHEDULE_TIME="$2"; shift 2 ;;
    --priority) PRIORITY="$2"; shift 2 ;;
    --tags)     TAGS="$2"; shift 2 ;;
    --title)    TITLE="$2"; shift 2 ;;
    *)          MESSAGE="$1"; shift ;;
  esac
done

if [ -z "$MESSAGE" ]; then
  echo "Usage: $0 \"message\" [--at \"time\"] [--in \"duration\"]"
  exit 1
fi

send_notification() {
  curl -s -H "Title: $TITLE" -H "Priority: $PRIORITY" -H "Tags: $TAGS" \
    -d "$MESSAGE" "$NTFY_SERVER/$NTFY_TOPIC" > /dev/null
  echo "Sent: $MESSAGE"
}

if [ -z "$SCHEDULE_TYPE" ]; then
  send_notification
elif [ "$SCHEDULE_TYPE" = "at" ]; then
  echo "$SCRIPT_DIR/remind.sh \"$MESSAGE\" --title \"$TITLE\" --priority \"$PRIORITY\" --tags \"$TAGS\"" | TZ="$TIMEZONE" at $SCHEDULE_TIME 2>&1 | grep -v "warning"
  echo "Scheduled for $SCHEDULE_TIME: $MESSAGE"
elif [ "$SCHEDULE_TYPE" = "in" ]; then
  echo "$SCRIPT_DIR/remind.sh \"$MESSAGE\" --title \"$TITLE\" --priority \"$PRIORITY\" --tags \"$TAGS\"" | TZ="$TIMEZONE" at now + $SCHEDULE_TIME 2>&1 | grep -v "warning"
  echo "Scheduled in $SCHEDULE_TIME: $MESSAGE"
fi
