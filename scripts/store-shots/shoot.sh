#!/usr/bin/env bash
# Takes the Google Play screenshots on an emulator (store-screenshots.yml).
#   bash scripts/store-shots/shoot.sh <Azqm-Preview.apk> <out dir>
# The preview build (com.tanatos.azqm.preview) has Pro, so no support banners. Demo data comes from seed.mjs and is
# written straight into the app's SQLite files (adb root works on google_apis emulator images).
set -euo pipefail
APK=$1
OUT=$2
PKG=com.tanatos.azqm.preview
D=/data/data/$PKG
WORK=$(mktemp -d)
mkdir -p "$OUT"

adb wait-for-device
adb root >/dev/null || true
sleep 3
adb wait-for-device
adb install -r "$APK"

# clean status bar: 09:41, full battery and signal, no notification icons
adb shell settings put global sysui_demo_allowed 1
demo() { adb shell am broadcast -a com.android.systemui.demo -e command "$@" >/dev/null; }
demo enter
demo clock -e hhmm 0941
demo battery -e level 100 -e plugged false
demo network -e wifi show -e level 4
demo network -e mobile show -e level 4 -e datatype none
demo notifications -e visible false

launch() { adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; sleep "${1:-10}"; }
owner() { adb shell stat -c %u:%g $D | tr -d '\r'; }

# pull a SQLite file (+ WAL), run SQL on it, push it back with the app's owner
patch_db() { # <device path> <sql file>
  local dev=$1 sqlf=$2 loc
  loc="$WORK/$(basename "$dev")"
  rm -f "$loc" "$loc-wal" "$loc-shm"
  adb pull "$dev" "$loc" >/dev/null
  adb pull "$dev-wal" "$loc-wal" >/dev/null 2>&1 || true
  adb pull "$dev-shm" "$loc-shm" >/dev/null 2>&1 || true
  sqlite3 "$loc" < "$sqlf"
  rm -f "$loc-wal" "$loc-shm"
  adb shell rm -f "$dev-wal" "$dev-shm"
  adb push "$loc" "$dev" >/dev/null
  adb shell chown "$(owner)" "$dev"
  adb shell restorecon "$dev" >/dev/null 2>&1 || true
}

shot() { # <route> <name> [wait]
  adb shell am start -W -a android.intent.action.VIEW -d "azqm-preview://$1" $PKG >/dev/null
  sleep "${3:-6}"
  adb exec-out screencap -p > "$OUT/$LANG-$2.png"
  echo "  $LANG-$2.png"
}

for LANG in en bg; do
  echo "== $LANG"
  adb shell pm clear $PKG >/dev/null
  launch 14 # creates azqm.db and RKStorage
  adb shell am force-stop $PKG
  sleep 2
  adb shell find $D -maxdepth 3 \( -name 'azqm.db*' -o -name 'RKStorage*' \)
  mkdir -p "$WORK/$LANG"
  node scripts/store-shots/seed.mjs $LANG "$WORK/$LANG"
  patch_db $D/files/SQLite/azqm.db "$WORK/$LANG/app.sql"
  patch_db $D/databases/RKStorage "$WORK/$LANG/kv.sql"

  launch 12
  shot "" 1-today
  shot "add" 2-add
  shot "analysis" 3-analysis 8
  shot "progress" 5-progress 8
  shot "diet" 6-diets
  shot "themes" 7-themes 8

  # a fast running for 13 h 40 min for the fasting screen
  adb shell am force-stop $PKG
  sleep 2
  node scripts/store-shots/seed.mjs $LANG "$WORK/$LANG" --fast
  patch_db $D/files/SQLite/azqm.db "$WORK/$LANG/fast.sql"
  launch 12
  shot "fasting" 4-fasting
  shot "" 0-today-fasting
done
ls -la "$OUT"
