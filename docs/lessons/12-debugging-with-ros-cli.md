# 课程 12——使用 ROS CLI 调试

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 操作员和维护者 | 15 分钟 | [课程 11](11-failure-modes-and-reconnection.md)；命令章节需要 ROS CLI |

## 学习目标

学习如何从操作员看到的现象定位到正确的诊断层级：先使用 UI，必要时再使用 ROS CLI。

[课程 11](11-failure-modes-and-reconnection.md)介绍了三层独立链路——browser↔rosbridge、rosbridge/relays↔ROS 2 graph、机器人工作区本身——以及“connected”和“data is fresh”是不同信号。本课将它们整理为按层级、按顺序检查的排查方法，避免凭猜测操作。内容汇总自[故障排查指南](../troubleshooting.md)及[`connect-external-device.md`](../extending/connect-external-device.md)的验证步骤，并解释每项检查适用于哪一层。

## 先查看 UI 已提供的信息

打开 terminal 前，先检查 Header 的 connection 状态点和 `SystemHealth`/`SystemAlerts` 面板（见[课程 07](07-ui-components.md#systemhealth--systemhealthjsx)）。它们已经显示课程 11 提到的两个信号：connection state 和各 topic 的 freshness。通常这就能确认当前是哪类问题。

## 常见现象速查

| 现象 | 常见原因 | 首要检查 |
| --- | --- | --- |
| 页面无法打开 | Flask 未运行或 `5050` 端口不可用 | 查看 UI launch terminal，确认 Flask node 正在运行 |
| 页面能打开，connection 指示为红色 | 浏览器无法连接 `9090` 上的 rosbridge | 检查配置的 host、port、防火墙和 rosbridge 进程 |
| connection 为绿色，但 map 或 pose 冻结 | rosbridge 可连接，但机器人 topics 数据过期 | 打开 Health 检查 topic freshness；暂停驾驶 |
| map 空白，但 pose/velocity 仍更新 | `/map` 或 `/ui/map` relay 链路缺失 | 检查 map server 和 `map_volatile_relay` |
| 只有 camera 画面为空 | camera topic 或可选 web-video server 不可用 | 检查所选 image topic 和 `8080` 端口 |
| Route/map 按钮无效 | 可选 `physnode_launch.py` helpers 未运行 | 启动 helper launch 后再试 |
| WiFi 断开后 Program 或 Mission 卡住 | 一次性 callback 或浏览器侧运行被中断 | 停止运行，确认机器人静止，重新连接后再明确启动 |

如果机器人运动或 localization 状态不确定，先停止发送命令并确认实体机器人状态，再继续排查。

## 第 1 层：browser ↔ rosbridge

打开浏览器 DevTools 的 Network 标签页，筛选 `WS`（WebSocket），选择连接到 `9090` 端口的记录。可以查看 roslibjs 发送和接收的 JSON frames，也就是[课程 03](03-how-the-browser-talks-to-ros.md#where-the-connection-is-opened)所述协议的实际传输内容。这是确认 `publish()` 是否已离开浏览器的最快方法。浏览器 console 也会显示 roslibjs 和本项目记录的 connection errors。

## 第 2 层：ROS 2 graph

以下命令无论浏览器是否打开都能使用，它们直接访问 ROS 2 graph，也就是 rosbridge 前方的 ROS 层：

- **`ros2 node list`**：确认当前运行的 nodes。对照[课程 02](02-ros2-core-concepts.md#launch-file)和[课程 05](05-backend-nodes-in-detail.md)中的 node 列表，确认当前 launch 应启动哪些节点。
- **`ros2 node info /node_name`**：查看指定 node 发布、订阅的内容，以及提供的 services/actions。可用于核对 relay（[课程 04](04-data-flow-and-relays.md)）是否按预期连接。
- **`ros2 topic list`**：先确认 graph 中是否存在该 topic，不涉及其中是否有数据。
- **`ros2 topic echo /topic_name`**：查看实时数据；没有 publisher 时会保持无输出。扩展设备指南用它区分 ROS 侧问题和 frontend 问题，见[`connect-external-device.md`](../extending/connect-external-device.md#5-confirm-it-end-to-end)。
- **`ros2 topic hz /topic_name`**：检查发布频率，而不只是确认 topic 存在。可区分“有发布，但频率低于 UI timeout”和“完全没有发布”，与 `SystemHealth` 的 timeout 检查有关（[课程 07](07-ui-components.md#systemhealth--systemhealthjsx)）。
- **`ros2 topic info /topic_name -v`**：查看包括 durability 在内的 QoS profile。用它确认 topic 是否为 `TRANSIENT_LOCAL`、是否可能需要 relay（见[课程 04](04-data-flow-and-relays.md#the-problem-qos-not-code)）。
- **`ros2 service list`** / **`ros2 service call`**：绕过 UI 直接调用 service，例如 lifecycle node 的 `get_state` 或 `compute_path_to_pose`。如果直接调用成功但对应 UI 面板失败，问题在 frontend 一侧。

## 第 3 层：机器人/仿真工作区

如果第 2 层确认 UI 侧 graph 正常（nodes 正在运行、topics 存在），问题仍然存在，通常就在机器人或仿真工作区（见[课程 01](01-what-is-this-ui.md#the-two-workspace-model)）。该工作区不在本仓库中；应检查其日志以及 Nav2/driver 状态，而不是继续查看 UI 代码。

<a id="a-decision-order-for-common-symptoms"></a>
## 常见现象的排查顺序

| 现象 | 首要检查 |
| --- | --- |
| 页面完全无法加载 | `5050` 端口上的 Flask，见[课程 05](05-backend-nodes-in-detail.md#flask_apppy--two-unrelated-jobs-in-one-process) |
| 页面加载，Header 显示 disconnected | `rosbridge_websocket` 进程和 `9090` 端口，见[课程 03](03-how-the-browser-talks-to-ros.md) |
| Header 显示 connected，但一个面板空白/冻结 | 对该面板的 topic 执行 `ros2 topic echo`/`hz`，见[课程 11](11-failure-modes-and-reconnection.md#two-different-signals-connected-vs-data-is-fresh) |
| `ros2 topic echo` 有数据，但面板仍空白 | frontend 问题：检查 constant、message type 和浏览器 console，即第 1 层 |
| `ros2 topic echo` 没有数据 | 问题在本 UI 工作区上游，即第 3 层 |

## 试一试

关闭 Demo Mode 并断开 rosbridge，对照现象表判断当前情况。然后启动 UI backend，使用 `ros2 node list` 和 `ros2 topic list` 确认哪个层级发生变化。

**完成标准：**无需猜测即可区分网页服务故障、rosbridge 故障和机器人 topic 数据过期。

## 下一课

这是进入实操指南前的最后一课。[课程 13——扩展系统](13-extending-the-system.md)会把已学内容与添加面板、设备或 Blockly block 的实践步骤衔接起来。

---

[← 课程 11](11-failure-modes-and-reconnection.md) · [课程索引](README.md) · [下一课：课程 13 →](13-extending-the-system.md)
