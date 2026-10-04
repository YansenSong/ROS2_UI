# 课程 10——Topic 是接口契约

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| Frontend 和 ROS 开发者 | 8 分钟 | [课程 03](03-how-the-browser-talks-to-ros.md) |

## 学习目标

了解 topic、service 和 action 名称如何构成跨工作区契约，以及 browser code 为什么应使用集中定义的 constants。

## 没有 compiler 帮你检查这份契约

UI（JavaScript 应用）和 robot stack（多个独立 ROS 2 processes，通常位于另一个工作区或另一台机器）不会互相 import code，也不会一起构建。因此，build 时没有任何检查会确认 UI 订阅的 topic 是否存在于机器人侧，也不会确认 UI 期望的 message type 是否与实际发布的一致。连接两侧的唯一约定，是[课程 02](02-ros2-core-concepts.md)介绍的 **topic name string** 和 **message type string**。如果 UI 订阅 `/ui/map`，但没有节点发布 `/ui/map`，系统不会报错；map panel 只会一直空白。

因此，topic name 本身就是 interface。只在一侧重命名 topic，而不更新另一侧，不会产生 stack trace，只会让面板停止更新且原因不明显。topic names 应像普通代码库中的 function signature 或 API schema 一样谨慎管理。它们难以自动检查，因此需要手动遵守约定。

## 为什么要集中定义名称

frontend 依赖的大多数 topics、services 和 actions 都集中在[`web/src/shared/constants/index.js`](../../web/src/shared/constants/index.js)（少量需要多个值的场景还会使用同文件中的 `LIFECYCLE_NODES` 和 `CAMERA_TOPIC_OPTIONS`）。这样有三项好处：

1. **在一个位置查看 UI 实际依赖的接口。** 查看此文件就能了解完整的 topic-level contract，无需搜索所有页面和组件。
2. **只需在一个位置更新重命名。** 例如机器人侧将 `/scan_filtered` 重命名后，只需在此处修改一行，不必逐个查找写死字符串的文件。
3. **减少静默的拼写不一致。** 同一个 string literal 若散落在三个文件中，很容易只更新其中一个。使用同一个 imported constant，所有使用方都会读取相同的值。

页面和组件会从此文件 import 常量，而不是直接写 topic strings。例如[`web/src/pages/MapPage.jsx`](../../web/src/pages/MapPage.jsx)和[`web/src/components/SystemHealth.jsx`](../../web/src/components/SystemHealth.jsx)使用 `AppConfig.GOAL_POSE_TOPIC`、`AppConfig.SCAN_TOPIC` 等。

目前仍有例外：`/rosout`（[`RosoutConsole.jsx`](../../web/src/components/RosoutConsole.jsx)）、`/reinitialize_global_localization`（[`LocalizationStatus.jsx`](../../web/src/components/LocalizationStatus.jsx)）和 `/diagnostics`（[`useSystemDiagnostics.js`](../../web/src/shared/hooks/useSystemDiagnostics.js)）仍以 hardcoded string literal 形式出现，并未加入 `AppConfig`。所以在将 `AppConfig` 当作完整清单前需留意这些例外，修改对应文件时也可考虑一并整理。

集中管理目前也只覆盖 frontend。[课程 05](05-backend-nodes-in-detail.md)介绍的 Python backend nodes（例如 `/map`、`/amcl_pose`、`ui_operation`、`/WayPoints_topic`）没有共用 constants module；每个 backend file 都自行写 topic strings。本课所说的 contract 目前只在 frontend 一侧集中记录。

## Relay 也属于这份契约

[课程 04](04-data-flow-and-relays.md)解释了 relay node 存在的原因。从 interface 的角度看，relay 只是让“浏览器正式订阅的名称”（`/ui/map`）与机器人原始发布名称（`/map`）不同。UI 侧 constant 始终保存浏览器最终订阅的名称。对 frontend 来说，relay 属于 ROS 侧的实现细节，除这个名称外无需感知。

## 试一试

在 `web/src/shared/constants/index.js` 中选择一个 constant，找出所有依赖它的 publisher 或 subscriber，并确认两侧使用的 message type。

**完成标准：**topic name 或 message type 变更时，能列出必须同步修改的文件。

## 下一课

[课程 11——故障模式与重连](11-failure-modes-and-reconnection.md)会介绍这份契约在运行时失效的情况，例如 WiFi 断开、rosbridge 重启或机器人工作区崩溃。[课程 12](12-debugging-with-ros-cli.md)会把这些故障整理为调试方法；[课程 13](13-extending-the-system.md)则从理论衔接到实际扩展指南。

---

[← 课程 09](09-blockly-programming.md) · [课程索引](README.md) · [下一课：课程 11 →](11-failure-modes-and-reconnection.md)
