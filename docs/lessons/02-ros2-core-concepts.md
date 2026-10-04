# 课程 02——ROS 2 核心概念

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 首次接触 ROS 2 的 UI 开发者 | 15 分钟 | [课程 01](01-what-is-this-ui.md) |

## 学习目标

了解本 UI 中反复出现的六个 ROS 2 概念：node、topic、message、service、action 和 launch file。

本课定义了后续课程和代码库中使用的基础术语。每个概念都链接到仓库中的实际示例，便于结合代码理解。

## Node

Node 是 ROS 2 graph 中负责一项工作的运行进程。Nodes 不会直接互相调用，而是通过发布/订阅 topics，或提供/调用 services 和 actions 通信；ROS 2 middleware 负责发现节点并传递消息。

本工作区的 nodes 是继承 ROS 2 `Node` class 的 Python classes。例如 Flask node 同时承担网页服务工作，见[`flask_app.py`](../../ros2/src/openamr_ui_package/openamr_ui_package/flask_app.py)中的 `ParamFlask(Node)`。map relay 和 navigation relay 是职责更单一的节点，分别见[`map_relay.py`](../../ros2/src/openamr_ui_package/openamr_ui_package/map_relay.py)和[`nav_relays.py`](../../ros2/src/openamr_ui_package/openamr_ui_package/nav_relays.py)。

## Topic

Topic 是有名称、有类型的 message stream。任何 node 都可以向 topic 发布数据，任何 node 都可以订阅它。Publisher 和 subscriber 不直接互相识别，只需约定相同的 topic **名称**和 message **类型**；见[课程 10](10-topics-as-the-contract.md)了解这一约定如何构成 interface。

例如，`/cmd_vel` 携带 UI 发布、机器人 driver 消费的速度命令；`/odom` 携带 robot pose/velocity，由机器人栈发布、UI 订阅。Frontend 依赖的 topic names 集中定义在[`web/src/shared/constants/index.js`](../../web/src/shared/constants/index.js)。

## Message

Message 是通过 topic 传输的 typed data structure，类似 struct。本项目使用的多数 messages 来自标准 ROS 2 packages（如 `geometry_msgs`、`nav_msgs`、`sensor_msgs`、`std_msgs`）；该 UI 没有自定义 message package。

例如，`/cmd_vel` 使用的 `geometry_msgs/Twist` 有 `linear` 和 `angular` 两个字段，每个字段都是 `{x, y, z}` 三元组。UI 只设置 `linear.x`（前进/后退速度）和 `angular.z`（转向命令），topic 上不会另外发送或要求其他内容。

## Service

Service 是 request/response 调用：发送一个 request 并收到一个 reply。从调用者的角度看，它是同步的一次性交互。需要一个明确答案时使用 service，而不是持续的数据流。本 UI 中的例子包括 lifecycle nodes 上的 `get_state`/`change_state`，以及 Nav2 planner 的 `compute_path_to_pose` action。

Nav2 的 `compute_path_to_pose` 实际是 action，而不是 service。尽管 UI 将它当成一次请求/响应操作，planner 计算期间并没有需要持续传送的部分结果。ROS 2 action 由 goal topic、`_action/get_result` service 等机制组成；Route 页面先发送 goal，再调用 result service 取得规划路径，因此 graph 上并不存在一个同名的普通 `/compute_path_to_pose` service。

## Action

Action 用于不适合用 service 表示的长时间任务：发送 goal、运行期间接收定期 feedback、最后取得 result，并且可以中途取消。Nav2 的 `navigate_to_pose` 就是 action：UI 发送目标 pose，订阅 feedback（剩余距离）和 status，并在需要时调用 cancel-goal service。

Map 页面通过 [`NavStatus.jsx`](../../web/src/components/NavStatus.jsx)订阅 feedback/status；页面级 cancel service client 由 Map 页面负责创建。顶部 E-STOP 按钮也会调用 cancel service（见[`StatusBar.jsx`](../../web/src/layouts/StatusBar.jsx)，该控件显示在每个页面上）。此 dashboard 按钮是非锁存的软件停止功能，不是物理或安全等级的 emergency stop。

一次 navigation 会产生多条信息：起始 goal、驾驶期间反复发送的 feedback（包含不断减少的 `distance_remaining`），以及结束时的一条 status update。UI 将数值 `4` 视为 succeeded，将 `5`/`6` 视为 canceled/failed。普通 service 无法表示“任务运行期间持续提供 feedback”这一需求。

## Launch file

Launch file 是启动一组 nodes 并加载对应配置的 Python script，无需在不同 terminal 中逐个手动启动。本工作区采用分层 launch 结构：

- [`new_ui_launch.py`](../../ros2/src/openamr_ui_package/launch/new_ui_launch.py)启动 UI 侧的 Flask、rosbridge 和 relay nodes。
- [`physnode_launch.py`](../../ros2/src/openamr_ui_package/launch/physnode_launch.py)额外启动 Route/map 文件操作和 waypoint navigation 等可选辅助节点。

这些 launch files 属于 UI 工作区。机器人、Nav2 和 drivers 由独立的机器人/仿真工作区负责启动（见[课程 01](01-what-is-this-ui.md#the-two-workspace-model)）。

## 试一试

在代码中找出一个 node class、一项 topic constant、使用该 topic 的 message type，以及启动相关节点的 launch file。

**完成标准：**能判断一个需求适合使用 topic、service 还是 action。

## 下一课

[课程 03——浏览器如何与 ROS 通信](03-how-the-browser-talks-to-ros.md)会追踪 UI 如何通过 rosbridge 连接到这些 ROS 2 概念。

---

[← 课程 01](01-what-is-this-ui.md) · [课程索引](README.md) · [下一课：课程 03 →](03-how-the-browser-talks-to-ros.md)
