# 课程 04——数据流与 relay 节点

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| ROS 开发者和维护者 | 10 分钟 | [课程 03](03-how-the-browser-talks-to-ros.md) |

## 学习目标

了解 QoS compatibility 为什么可能需要 relay，以及 `/ui/*` topics 如何提供适合浏览器使用的数据副本，同时不更改机器人侧 publisher。

计划把新外部设备、sensor 或 actuator 接入 UI 的读者应重点阅读本课（另见[`docs/extending/connect-external-device.md`](../extending/connect-external-device.md)）。本课介绍一种反复使用的数据转发模式：**机器人 topic → relay node → 浏览器可用的 topic**。

<a id="the-problem-qos-not-code"></a>
## 问题出在 QoS，而不是代码

ROS 2 topic 会附带 Quality of Service（QoS）profile，即 publisher 和 subscriber 要大致一致的一组传递行为设置。QoS 有多项设置；本课只讨论 **durability**，它有两个取值：

- **TRANSIENT_LOCAL**（常称为“锁存”）：晚加入的 subscriber 仍能收到最近一次发布的消息，而不只是后续消息。map server 以此方式发布 `/map`。地图不会每帧变化，通常只发布一次或偶尔发布，因此后启动的节点也要能取得它。
- **VOLATILE**：只有当时正在监听的 subscriber 能收到新消息；不会为晚加入者重放之前的数据。

另一个独立设置叫 *reliability*，取值为 RELIABLE 或 BEST_EFFORT，决定丢包后是否重试。它不是本课所讨论问题的根源。

Nav2 节点能够正确处理 TRANSIENT_LOCAL topic。但经 rosbridge 连接的浏览器客户端，很可能在该 topic 首次发布后才订阅，因此可能错过消息。此工作区通过一个小型 relay node 解决：订阅机器人侧的 TRANSIENT_LOCAL topic，再以 VOLATILE 方式将相同数据发布到另一个 topic；对于 map，还会使用 timer 定期重发，让较晚连接的浏览器也能收到。

**它避免的实际问题：**如果 `map_server` 启动几秒后才打开 Map 页面（通常机器人栈会先启动，操作员之后才打开 UI），没有 relay 时，地图面板可能一直空白。即使 map server 已正确发布，命令行运行 `ros2 topic echo /map` 也能看到数据，浏览器仍可能收不到。relay 每 2 秒重发一次，确保新打开的浏览器标签页无论何时订阅都能取得副本。

## 本代码库中的模式

```text
机器人/仿真栈                         本 UI 工作区                    浏览器
-----------------                     -------------                    ------
/map (TRANSIENT_LOCAL)  --->           map_relay node       --->         订阅 /ui/map
由 map_server 发布                       以 VOLATILE 重发                   每 2 秒发布一次
                                         到 /ui/map
```

具体实现见[`ros2/src/robotpilot_ui_package/robotpilot_ui_package/map_relay.py`](../../ros2/src/robotpilot_ui_package/robotpilot_ui_package/map_relay.py)。该实现刻意保持精简，可作为新增 relay 的参考。

同一模式也用于 navigation 和 docking status，由[`ros2/src/robotpilot_ui_package/robotpilot_ui_package/nav_relays.py`](../../ros2/src/robotpilot_ui_package/robotpilot_ui_package/nav_relays.py)这个节点统一处理：

| 机器人侧 topic（TRANSIENT_LOCAL） | UI 侧 topic（VOLATILE） |
| --- | --- |
| `/amcl_pose` | `/ui/amcl_pose` |
| `/navigate_to_pose/_action/status` | `/ui/navigate_to_pose/status` |
| `/dock_robot/_action/status` | `/ui/dock_robot/status` |
| `/undock_robot/_action/status` | `/ui/undock_robot/status` |

两个 relay 节点与 Flask 和 rosbridge 一起由[`ros2/src/robotpilot_ui_package/launch/new_ui_launch.py`](../../ros2/src/robotpilot_ui_package/launch/new_ui_launch.py)启动，并放在 `ui` namespace 下。

## 并非每个 topic 都需要 relay

UI 订阅的许多 topics——例如 `/odom`、`/scan_filtered`、`/global_costmap/costmap`、`/plan`、`/tf` 和 `/tf_static`——本身就是 VOLATILE，或实际使用中没有晚订阅者收不到数据的问题，因此直接订阅，不经 relay。relay 是针对特定 QoS mismatch 的解决方法，不是每个 topic 都必须经过的环节。新增 topic 是否需要 relay，正是[`docs/extending/connect-external-device.md`](../extending/connect-external-device.md)会协助判断的问题。

<a id="the-naming-convention"></a>
## 命名约定

relay topics 使用 `/ui/` 前缀（如 `/ui/map`、`/ui/amcl_pose`）。这是一种约定，不是技术要求；它让人查看 topic 列表时可以快速区分面向浏览器的转发 topic 和原始机器人侧 topic。添加 relay 时请沿用此约定。

## 试一试

系统运行时，分别运行 `ros2 topic info -v /map` 和 `ros2 topic info -v /ui/map`。找出 relay 两侧的 publisher、subscriber、durability 和 reliability。

**完成标准：**能解释为什么即便 topic 名称和 message 内容看起来正确，有时仍需要 relay。

## 下一课

[课程 05——后端节点详解](05-backend-nodes-in-detail.md)会继续介绍 ROS 侧：除两个 relay 外，`robotpilot_ui_package` 还会运行什么。之后[课程 06——所有页面导览](06-the-pages.md)会逐页介绍界面显示内容，以及各页面依赖的 topics（无论是否经过 relay）。

---

[← 课程 03](03-how-the-browser-talks-to-ros.md) · [课程索引](README.md) · [下一课：课程 05 →](05-backend-nodes-in-detail.md)
