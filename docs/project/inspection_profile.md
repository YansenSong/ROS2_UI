# Inspection profile status

Build with `REACT_APP_UI_PROFILE=inspection_demo` to show the reduced
inspection navigation. This is a compile-time UI profile; it is independent
of the existing Demo Mode toggle in Config. Without that environment value,
the existing OpenAMRobot navigation and routes remain available.

The browser UI now defaults to Simplified Chinese. The language button in the
header cycles through Chinese, English, and German. The selection is stored
under `openamrLangV2`; older language defaults are reset once so existing
browsers also start in Chinese. Core navigation and the main operator pages
are localized; some legacy page details and ROS-originated messages remain
in English.

The project profile currently exposes saved mission drafts but **cannot run
them**. The repository contains only a browser `MissionRunner` and Nav2
`BasicNavigator` waypoint implementation. Neither is a verified robot-side
executor for the proposed LIO-SAM / NDT / Hybrid A* / NeuPAN stack. The
browser runner is not mounted in the project profile. Navigation controls,
unverified manual control, and Software Stop are disabled there. Robot
navigation/localization status is explicitly UNKNOWN.

This is an incomplete adaptation, not a deployable inspection demo. The
remaining work requires the accepted robot-side interfaces listed in
[`robot_interface_inventory.md`](robot_interface_inventory.md), followed by
mission persistence/transport, robot-side execution, Demo Mode fixture,
reconnect behavior, and automated and manual validation. Do not use this
profile to operate a physical robot.

## Verification limits

The frontend now uses Vite and Vitest with Node 24 support. On 2026-10-01,
`npm ci` succeeded with one upstream `whatwg-encoding` deprecation notice;
`npm test` passed 4 tests across 2 files; both default and `inspection_demo` production
builds succeeded. The project profile build emits no large-chunk warning;
the legacy build retains one for the optional Blockly editor. A local
production preview rendered the Chinese project navigation and status with
no robot connection. The local shell had no `ros2` or `colcon`, so ROS
integration was not checked. `python -m py_compile` on the two changed relay
files and `git diff --check` succeeded. These checks do not prove runtime
robot behavior or physical safety.
