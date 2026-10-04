# Robot interface inventory — 2026-10-01

Base: `aef93d5071291f82718493ce3ac56ca2372ca93d`.

This is a source inspection of this UI repository, not a live ROS graph check. The
project robot workspace and accepted `openamrobot-interfaces` contract were not
available. Existing Nav2 names below describe legacy UI compatibility only.

| Capability | Interface found in this repo | Type | QoS/source | Project status |
| --- | --- | --- | --- | --- |
| 2D map | `/map` → `/ui/map` | `nav_msgs/OccupancyGrid` | transient local input, volatile UI output; 2 s republish | Existing relay; project publisher TODO |
| robot pose | `/amcl_pose` → `/ui/amcl_pose`; `/odom` fallback | `geometry_msgs/PoseWithCovarianceStamped`; `nav_msgs/Odometry` | transient local relay; odom not inventoried | NDT pose TODO |
| localization state | None | Unknown | Unknown | TODO |
| navigation goal | `/goal_pose` legacy | `geometry_msgs/PoseStamped` | Unknown | Project goal TODO |
| navigation feedback | `/navigate_to_pose/_action/feedback` legacy | Nav2 action feedback | Unknown | Project feedback TODO |
| navigation cancel | `/navigate_to_pose/_action/cancel_goal` legacy | `action_msgs/CancelGoal` | Service | Project cancel TODO |
| mission command/state | Browser `MissionRunner`; `waypoint_nav.py` uses `BasicNavigator` | No accepted project contract | N/A | BLOCKED: robot executor contract not supplied |
| software stop | One zero Twist + Nav2 cancel in legacy browser | Not a safety interface | N/A | BLOCKED: software stop service not supplied |
| manual control | `/cmd_vel` direct legacy joystick | `geometry_msgs/Twist` | Unknown | BLOCKED: safety managed input not confirmed |
| battery/BMS | `battery_status` local node | `std_msgs/Float32` | Depth 10; dummy fallback possible | Project BMS TODO; value cannot prove real BMS |
| diagnostics | `/diagnostics` browser consumer | `diagnostic_msgs/DiagnosticArray` | Unknown | Project publisher TODO |

The only `.msg` file in this checkout is
`ros2/src/openamr_ui_msgs/msg/ArrayPoseStampedWithCovariance.msg`; no mission
action, service, or message contract is present. `map_relay.py` and
`nav_relays.py` currently hardcode their source and destination names.

## Acceptance and next integration input

All project topic names and message types remain **Proposed / unaccepted**.
The owner must provide the robot ROS graph or accepted interface definitions
for navigation, localization, mission control/state, software stop, and safe
manual control. Then verify type, QoS, goal identity, reconnect behavior, and
robot-side ownership against the running robot or integrated simulation.

No automated test or source inspection here validates physical motion safety.
