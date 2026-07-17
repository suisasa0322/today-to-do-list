#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
INSTALLER="$SCRIPT_DIR/install-macos-app.command"
TEMP_ROOT="$(mktemp -d)"
ORIGINAL_PATH="$PATH"
trap 'rm -rf "$TEMP_ROOT"' EXIT

fail() {
  print -u2 -- "FAIL: $*"
  exit 1
}

assert_status() {
  local expected="$1"
  local description="$2"
  [[ "$RUN_STATUS" == "$expected" ]] || fail "$description (status: $RUN_STATUS)"
}

assert_failure() {
  local description="$1"
  (( RUN_STATUS != 0 )) || fail "$description (status: $RUN_STATUS)"
}

assert_content() {
  local path="$1"
  local expected="$2"
  local description="$3"
  [[ -f "$path" ]] || fail "$description (missing: $path)"
  [[ "$(<"$path")" == "$expected" ]] || fail "$description (unexpected content: $path)"
}

assert_no_staging() {
  local install_dir="$1"
  local staging=("$install_dir"/.Today\ To\ Do\ List.install-*(N))
  (( ${#staging[@]} == 0 )) || fail "staging directory was not cleaned: ${staging[1]}"
}

assert_no_backups() {
  local install_dir="$1"
  local backups=("$install_dir"/Today\ To\ Do\ List.backup-*.app(N))
  (( ${#backups[@]} == 0 )) || fail "unexpected backup: ${backups[1]}"
}

make_app() {
  local app="$1"
  local version="$2"
  local identifier="${3:-com.suisasa.todaytodolist}"

  mkdir -p "$app/Contents/MacOS"
  print -r -- "$version" > "$app/Contents/version.txt"
  plutil -create xml1 "$app/Contents/Info.plist"
  plutil -insert CFBundleIdentifier -string "$identifier" "$app/Contents/Info.plist"
}

make_case() {
  local name="$1"
  CASE_ROOT="$TEMP_ROOT/$name"
  SOURCE_APP="$CASE_ROOT/source/Today To Do List.app"
  INSTALL_DIR="$CASE_ROOT/Applications"
  DESTINATION="$INSTALL_DIR/Today To Do List.app"
  OUTPUT="$CASE_ROOT/installer.out"
  SHIM_DIR="$CASE_ROOT/shims"
  mkdir -p "$SHIM_DIR"
}

run_installer() {
  local random_seed="${1:-123}"

  if env \
    TODAY_TODO_SOURCE_APP="$SOURCE_APP" \
    TODAY_TODO_INSTALL_DIR="$INSTALL_DIR" \
    RANDOM="$random_seed" \
    PATH="$SHIM_DIR:$ORIGINAL_PATH" \
      zsh "$INSTALLER" >"$OUTPUT" 2>&1; then
    RUN_STATUS=0
  else
    RUN_STATUS=$?
  fi
}

write_date_shim() {
  {
    print -r -- '#!/bin/zsh'
    print -r -- 'print -r -- "20260717-000000"'
  } > "$SHIM_DIR/date"
  chmod +x "$SHIM_DIR/date"
}

write_failing_ditto_shim() {
  {
    print -r -- '#!/bin/zsh'
    print -r -- 'destination="${@[-1]}"'
    print -r -- 'mkdir -p "$destination/Contents"'
    print -r -- 'print -r -- partial > "$destination/Contents/version.txt"'
    print -r -- 'exit 71'
  } > "$SHIM_DIR/ditto"
  chmod +x "$SHIM_DIR/ditto"
}

write_switch_failure_mv_shim() {
  local fail_restore="$1"
  {
    print -r -- '#!/bin/zsh'
    print -r -- 'source_path="$1"'
    print -r -- 'destination="$2"'
    print -r -- 'if [[ "$destination" == */Today\ To\ Do\ List.app && "$source_path" == */.Today\ To\ Do\ List.install-* ]]; then'
    print -r -- '  exit 72'
    print -r -- 'fi'
    print -r -- "if [[ \"$fail_restore\" == yes && \"\$destination\" == */Today\\ To\\ Do\\ List.app && \"\$source_path\" == */Today\\ To\\ Do\\ List.backup-*.app ]]; then"
    print -r -- '  exit 73'
    print -r -- 'fi'
    print -r -- 'exec /bin/mv "$@"'
  } > "$SHIM_DIR/mv"
  chmod +x "$SHIM_DIR/mv"
}

test_successful_replacement() {
  make_case successful-replacement
  make_app "$SOURCE_APP" new
  make_app "$DESTINATION" old

  run_installer

  assert_status 0 "valid application should install"
  assert_content "$DESTINATION/Contents/version.txt" new "destination was not replaced"
  local backups=("$INSTALL_DIR"/Today\ To\ Do\ List.backup-*.app(N))
  (( ${#backups[@]} == 1 )) || fail "expected one backup, found ${#backups[@]}"
  assert_content "$backups[1]/Contents/version.txt" old "previous app was not preserved"
  assert_no_staging "$INSTALL_DIR"
}

test_missing_plist_rejected() {
  make_case missing-plist
  mkdir -p "$SOURCE_APP/Contents/MacOS"
  print -r -- new > "$SOURCE_APP/Contents/version.txt"
  make_app "$DESTINATION" old

  run_installer

  assert_failure "source without Info.plist should be rejected"
  assert_content "$DESTINATION/Contents/version.txt" old "invalid source changed destination"
  assert_no_backups "$INSTALL_DIR"
  assert_no_staging "$INSTALL_DIR"
}

test_invalid_plist_rejected() {
  make_case invalid-plist
  mkdir -p "$SOURCE_APP/Contents/MacOS"
  print -r -- new > "$SOURCE_APP/Contents/version.txt"
  print -r -- 'not a plist' > "$SOURCE_APP/Contents/Info.plist"
  make_app "$DESTINATION" old

  run_installer

  assert_failure "unparseable Info.plist should be rejected"
  assert_content "$DESTINATION/Contents/version.txt" old "invalid source changed destination"
  assert_no_backups "$INSTALL_DIR"
  assert_no_staging "$INSTALL_DIR"
}

test_wrong_identifier_rejected() {
  make_case wrong-identifier
  make_app "$SOURCE_APP" new com.example.not-today-todo
  make_app "$DESTINATION" old

  run_installer

  assert_failure "wrong bundle identifier should be rejected"
  assert_content "$DESTINATION/Contents/version.txt" old "wrong app changed destination"
  assert_no_backups "$INSTALL_DIR"
  assert_no_staging "$INSTALL_DIR"
}

test_backup_collision_is_safe() {
  make_case backup-collision
  make_app "$SOURCE_APP" new
  make_app "$DESTINATION" old
  write_date_shim

  local collision="$INSTALL_DIR/Today To Do List.backup-20260717-000000-3231.app"
  make_app "$collision" collision

  run_installer 123

  assert_status 0 "existing backup should remain intact while preserving the previous app separately"
  assert_content "$DESTINATION/Contents/version.txt" new "destination was not replaced"
  assert_content "$collision/Contents/version.txt" collision "existing backup was overwritten"
  [[ ! -e "$collision/Today To Do List.app" ]] || fail "previous app was nested in existing backup"

  local backups=("$INSTALL_DIR"/Today\ To\ Do\ List.backup-*.app(N))
  (( ${#backups[@]} == 2 )) || fail "expected existing and new backups, found ${#backups[@]}"
  local backup found_old=no
  for backup in "$backups[@]"; do
    if [[ -f "$backup/Contents/version.txt" && "$(<"$backup/Contents/version.txt")" == old ]]; then
      found_old=yes
    fi
  done
  [[ "$found_old" == yes ]] || fail "previous app was not preserved as a direct backup"
  assert_no_staging "$INSTALL_DIR"
}

test_staging_copy_failure_cleans_up() {
  make_case staging-copy-failure
  make_app "$SOURCE_APP" new
  make_app "$DESTINATION" old
  write_failing_ditto_shim

  run_installer

  assert_failure "staging copy failure should fail installation"
  assert_content "$DESTINATION/Contents/version.txt" old "copy failure changed destination"
  assert_no_backups "$INSTALL_DIR"
  assert_no_staging "$INSTALL_DIR"
}

test_switch_failure_restores_previous_app() {
  make_case switch-failure-restores
  make_app "$SOURCE_APP" new
  make_app "$DESTINATION" old
  write_switch_failure_mv_shim no

  run_installer

  assert_failure "switch failure should fail installation"
  assert_content "$DESTINATION/Contents/version.txt" old "previous app was not restored"
  assert_no_backups "$INSTALL_DIR"
  assert_no_staging "$INSTALL_DIR"
  grep -F -- 'previous app was restored' "$OUTPUT" >/dev/null || fail "restore success was not reported"
}

test_restore_failure_reports_backup() {
  make_case restore-failure
  make_app "$SOURCE_APP" new
  make_app "$DESTINATION" old
  write_switch_failure_mv_shim yes

  run_installer

  assert_failure "restore failure should fail installation"
  [[ ! -e "$DESTINATION" ]] || fail "restore failure unexpectedly recreated destination"
  local backups=("$INSTALL_DIR"/Today\ To\ Do\ List.backup-*.app(N))
  (( ${#backups[@]} == 1 )) || fail "expected one surviving backup, found ${#backups[@]}"
  assert_content "$backups[1]/Contents/version.txt" old "surviving backup does not contain previous app"
  grep -F -- "$backups[1]" "$OUTPUT" >/dev/null || fail "restore failure did not report backup path"
  ! grep -F -- 'previous app was restored' "$OUTPUT" >/dev/null || fail "restore failure falsely reported success"
  assert_no_staging "$INSTALL_DIR"
}

test_switch_failure_without_previous_app_is_truthful() {
  make_case switch-failure-without-previous
  make_app "$SOURCE_APP" new
  write_switch_failure_mv_shim no

  run_installer

  assert_failure "switch failure should fail installation"
  [[ ! -e "$DESTINATION" ]] || fail "switch failure unexpectedly created destination"
  assert_no_backups "$INSTALL_DIR"
  ! grep -F -- 'previous app was restored' "$OUTPUT" >/dev/null || fail "switch failure falsely reported restoring an app"
  assert_no_staging "$INSTALL_DIR"
}

TEST_NAMES=(
  successful_replacement
  missing_plist_rejected
  invalid_plist_rejected
  wrong_identifier_rejected
  backup_collision_is_safe
  staging_copy_failure_cleans_up
  switch_failure_restores_previous_app
  restore_failure_reports_backup
  switch_failure_without_previous_app_is_truthful
)

if (( $# == 0 )); then
  REQUESTED_TESTS=("$TEST_NAMES[@]")
else
  REQUESTED_TESTS=("$@")
fi

for test_name in "$REQUESTED_TESTS[@]"; do
  (( ${TEST_NAMES[(Ie)$test_name]} > 0 )) || fail "unknown test: $test_name"
  "test_$test_name"
  print -r -- "PASS: $test_name"
done

print -r -- "Installer test passed (${#REQUESTED_TESTS[@]} cases)"
