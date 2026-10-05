#!/usr/bin/env bash
# ROS 2 setup files read optional variables that may not exist yet, so nounset
# must remain disabled until every overlay has been sourced.
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROS_DISTRO_NAME="${ROS_DISTRO:-humble}"
ROS_SETUP="/opt/ros/${ROS_DISTRO_NAME}/setup.bash"
ACKERMANN_WS="${ACKERMANN_ROBOT_WS:-${REPO_ROOT}/../AckermannRobot}"
ACKERMANN_SETUP="${ACKERMANN_WS}/install/setup.bash"
UI_SETUP="${REPO_ROOT}/ros2/install/setup.bash"

if [ -f "${ROS_SETUP}" ]; then
  # shellcheck disable=SC1090
  source "${ROS_SETUP}"
fi

# The simulation publishes /navigation/state with nav_status/NavigationStatus.
# rosbridge must inherit the Ackermann overlay so it can resolve that custom
# message type when the browser subscribes.
if [ -f "${ACKERMANN_SETUP}" ]; then
  # shellcheck disable=SC1090
  source "${ACKERMANN_SETUP}"
else
  echo "WARNING: AckermannRobot overlay not found: ${ACKERMANN_SETUP}"
  echo "The /navigation/state browser subscription will be unavailable."
fi

if [ -f "${UI_SETUP}" ]; then
  # shellcheck disable=SC1090
  source "${UI_SETUP}"
else
  echo "ERROR: ROS2_UI overlay not found: ${UI_SETUP}"
  echo "Run: source ${ROS_SETUP} && bash scripts/build_ros.sh"
  exit 1
fi

set -u

if ! command -v ros2 >/dev/null 2>&1; then
  echo "ERROR: ros2 CLI not found. ROS2 is required to run the UI backend."
  echo "If you are in Codespaces without ROS2, run only the frontend (web/) for now."
  exit 1
fi

ros2 launch openamr_ui_bringup ui.launch.py
