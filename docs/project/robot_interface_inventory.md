# 机器人接口清单 — 2026-10-01

基准版本：`aef93d5071291f82718493ce3ac56ca2372ca93d`。

此文档基于本 UI 仓库源码检查，并非对实时 ROS graph 的检查。当前无法访问项目机器人工作区和已接受的
`openamrobot-interfaces` 契约。下表中现有的 Nav2 名称仅用于说明 UI 对旧接口的兼容支持。

| 能力 | 本仓库中的接口 | 类型 | QoS/来源 | 项目状态 |
| --- | --- | --- | --- | --- |
| 2D 地图 | `/map` → `/ui/map` | `nav_msgs/OccupancyGrid` | transient local 输入，UI volatile 输出；每 2 秒转发 | 已有中继；项目侧发布器待实现 |
| 机器人位姿 | `/amcl_pose` → `/ui/amcl_pose`；回退到 `/odom` | `geometry_msgs/PoseWithCovarianceStamped`；`nav_msgs/Odometry` | transient local 中继；未清点 odom | NDT 位姿待实现 |
| 定位状态 | 无 | 未知 | 未知 | 待实现 |
| 导航目标 | 旧接口 `/goal_pose` | `geometry_msgs/PoseStamped` | 未知 | 项目目标接口待实现 |
| 导航反馈 | 旧接口 `/navigate_to_pose/_action/feedback` | Nav2 action 反馈 | 未知 | 项目反馈接口待实现 |
| 导航取消 | 旧接口 `/navigate_to_pose/_action/cancel_goal` | `action_msgs/CancelGoal` | Service | 项目取消接口待实现 |
| 任务命令/状态 | 浏览器端 `MissionRunner`；`waypoint_nav.py` 使用 `BasicNavigator` | 尚无已接受的项目契约 | 不适用 | 阻塞：尚未提供机器人执行器契约 |
| 软件停止 | 旧版浏览器逻辑发送一次零 Twist 并取消 Nav2 目标 | 非安全接口 | 不适用 | 阻塞：尚未提供软件停止 service |
| 手动控制 | 旧版摇杆直接使用 `/cmd_vel` | `geometry_msgs/Twist` | 未知 | 阻塞：尚未确认由安全层管理的输入接口 |
| 电池/BMS | 本地节点 `battery_status` | `std_msgs/Float32` | 深度 10；可能使用虚拟值回退 | 项目 BMS 接口待实现；该值不能证明来自真实 BMS |
| 诊断 | 浏览器消费 `/diagnostics` | `diagnostic_msgs/DiagnosticArray` | 未知 | 项目发布器待实现 |

当前检出版本中唯一的 `.msg` 文件是
`ros2/src/openamr_ui_msgs/msg/ArrayPoseStampedWithCovariance.msg`；仓库中没有任务 action、service 或 message 契约。
`map_relay.py` 和 `nav_relays.py` 当前将源名称和目标名称硬编码在代码中。

## 接受状态及下一步集成所需输入

所有项目 topic 名称和消息类型仍处于**提议中/尚未接受**状态。接口所有者必须提供机器人 ROS graph 或已接受的
导航、定位、任务控制/状态、软件停止和安全手动控制接口定义。之后应在运行中的机器人或集成仿真中核实类型、QoS、目标标识、
重连行为和机器人侧职责归属。

此处的自动测试或源码检查均不能验证实体运动安全。
