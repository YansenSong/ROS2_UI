# 课程 11——故障模式与重连

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 操作员和维护者 | 12 分钟 | [课程 03](03-how-the-browser-talks-to-ros.md) |

## 学习目标

了解哪些连接会自动恢复、断连后哪些操作可能卡住，以及 connection state 为什么不等于 topic data freshness。

前面的课程介绍了机器人和 UI 正常运行、所有连接均正常时的情况。但移动机器人可能遇到 WiFi 断连、进程重启和浏览器刷新。本课说明这些情况实际会发生什么，并介绍排查“系统是否故障”时最关键的一点：**connection state 和 data freshness 是两个不同的信号。**

## WebSocket connection：每秒重试，直到恢复

重连逻辑位于[`web/src/app/App.jsx`](../../web/src/app/App.jsx)，结构详见[课程 03](03-how-the-browser-talks-to-ros.md)。WebSocket 触发 `close` 或 `error` 时，程序会按固定间隔（`AppConfig.RECONNECTION_TIME`，1000&nbsp;ms）不断重试，不限制次数。针对局域网内的机器人 UI，此实现选择简单直接：rosbridge 恢复可连接后，浏览器大约一秒内会重新连上；代价是断连期间每秒都会尝试连接一次。

Header 状态点和 `SystemHealth`/`SystemAlerts` 面板（见[课程 07](07-ui-components.md#systemhealth--systemhealthjsx)）都会在连接断开或恢复后约一秒内更新，因为它们读取的都是这段重试逻辑设置的同一个 `RosStatusContext` 值。

## 重连后会恢复什么，哪些操作不会自动恢复

重连后，各面板不会重新运行 subscription 初始化逻辑：创建每个 `ROSLIB.Topic` 的 `useEffect` 只会在 `ros` 首次可用时运行一次（参见[`docs/extending/add-a-ui-panel.md`](../extending/add-a-ui-panel.md)中的模式）。这是因为 roslibjs 的 `Topic` 默认设置 `reconnect_on_close: true`：底层 WebSocket 重新打开后，它会自动重新发送 subscribe（或 advertise）消息，无需本代码库逻辑额外处理。因此，断连前已订阅的面板会自动重新订阅。

**不会**自动恢复的是连接中断时正在等待一次性响应的操作，例如尚未返回的 `ROSLIB.Service` call（`get_state`、`compute_path_to_pose` 或 navigation cancel service）。这些操作没有内置 retry，可能收不到 callback 并一直等待，未必会明确报告失败。

<a id="two-different-signals-connected-vs-data-is-fresh"></a>
## 两种不同信号：“connected”与“data is fresh”

`RosStatusContext`（`connected`/`disconnected`/`error`）只表示**浏览器到 rosbridge 的 WebSocket**是否打开，不表示机器人侧是否正在发布数据。如果机器人或仿真工作区崩溃，但 `rosbridge_websocket` 仍在运行，WebSocket 不会关闭，`RosStatusContext` 仍显示 `connected`，而各 topic subscription 已停止收到新消息。

`SystemHealth` 按 topic 跟踪 online/offline 状态（见[课程 07](07-ui-components.md#systemhealth--systemhealthjsx)），根据各 topic 最近一次收到 message 的时间判断，不受 WebSocket 状态影响。如果 Header 显示 `Connected`，但 map 或 robot pose 不再更新，应查看 `SystemHealth` 和机器人/仿真工作区日志。此时浏览器到 rosbridge 的链路正常，问题在更上游。

## 三层链路，各自独立恢复

系统中有三条独立连接，各自恢复方式不同，也没有共用的恢复代码：

| 层级 | 内容 | 恢复方式 |
| --- | --- | --- |
| 浏览器 ↔ rosbridge | [课程 03](03-how-the-browser-talks-to-ros.md)中的 WebSocket | `App.jsx` 的 1 秒重试循环 |
| rosbridge/relays ↔ ROS 2 graph | 原生 ROS 2 node discovery（DDS） | 自动恢复；这是 ROS 2 middleware 的属性，本 UI 不负责 |
| 机器人/仿真工作区 | [课程 01](01-what-is-this-ui.md)介绍的进程 | 按该工作区定义的流程重启；不在本仓库范围内 |

机器人工作区重启不会停止 `map_relay`/`nav_relays`。它们是独立进程，机器人侧恢复前没有数据可转发；机器人恢复后，relay 会通过 DDS discovery 自动重新收到数据。浏览器强制刷新则会销毁并重新创建 `ROSLIB.Ros()` connection，因此确实能解决一类前端 state 卡住的问题，这类问题单靠等待每秒重试未必会消失。

## 试一试

在仿真环境中停止 rosbridge 并观察 connection 指示灯，再重新启动 rosbridge。然后保持 rosbridge 运行，单独停止一个机器人 topic publisher，比较 Health 页的结果。

**完成标准：**能区分 WebSocket 故障与机器人数据过期，并知道何时必须手动重新启动中断的操作。

## 下一课

[课程 12——使用 ROS CLI 调试](12-debugging-with-ros-cli.md)将介绍一套可重复的排查方法：各层分别使用什么命令、按什么顺序检查。

---

[← 课程 10](10-topics-as-the-contract.md) · [课程索引](README.md) · [下一课：课程 12 →](12-debugging-with-ros-cli.md)
