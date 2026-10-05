# OpenAMRobot UI — 课程

本系列按顺序介绍 UI 的实际工作方式。首次使用的操作员应从课程 00 开始。安装、构建、运行和故障排查步骤请参阅
[仓库根目录 README](../../README.md)。添加功能的实操指南请参阅 [`docs/extending/`](../extending/README.md)。
如需快速查询术语而无需阅读整篇课程，请参阅[术语表](glossary.md)。

| 编号 | 课程 | 内容 |
| --- | --- | --- |
| 00 | [前 10 分钟](00-your-first-10-minutes.md) | 共用控件、系统就绪状态、安全的首次会话及软件停止功能的限制 |
| 01 | [这是什么 UI？](01-what-is-this-ui.md) | UI 的职责边界、双工作区模式，以及未实现身份验证的安全提示 |
| 02 | [ROS 2 核心概念](02-ros2-core-concepts.md) | Node、topic、message、service、action、launch 文件 |
| 03 | [浏览器如何与 ROS 通信](03-how-the-browser-talks-to-ros.md) | roslibjs → rosbridge 链路、Flask 和相机数据链路 |
| 04 | [数据流与中继节点](04-data-flow-and-relays.md) | `map_relay`/`nav_relays` 的作用及中继模式 |
| 05 | [后端节点详解](05-backend-nodes-in-detail.md) | `flask_app.py`、`folders_handler.py`、`waypoint_nav.py`、`battery.py` 及三阶段构建流程 |
| 06 | [所有页面导览](06-the-pages.md) | 当前页面的用途和 topic |
| 07 | [UI 组件详解](07-ui-components.md) | Map 和 Route 页面所用面板，以及应用框架 |
| 08 | [地图和路线文件模型](08-map-and-route-model.md) | 分组 → 地图 → 路线的文件层级 |
| 10 | [Topic 作为接口契约](10-topics-as-the-contract.md) | 集中管理 topic 名称的原因 |
| 11 | [故障模式与重连](11-failure-modes-and-reconnection.md) | 哪些故障会发生、哪些状态可自行恢复、哪些不会 |
| 12 | [使用 ROS CLI 调试](12-debugging-with-ros-cli.md) | 不同层级适用的命令 |
| 13 | [扩展系统](13-extending-the-system.md) | 如何衔接实操指南 |

每篇课程都会注明适读对象、预计阅读时间、前置知识和学习目标，并通过小练习和检查点提示何时可以继续。
源码链接直接指向实际实现，避免复制可能过时的代码。

## 按角色选择阅读路径

建议首次按目录顺序阅读。时间有限时，可根据角色选择以下精简路径：

- **日常操作机器人：** 00、01、06、11，然后阅读 12 中的通俗说明。除非遇到故障，否则可以跳过后端和构建细节。
- **自动化日常任务（Scheduler、Missions）：** 00、01、[课程 06](06-the-pages.md) 中相关章节。
- **添加 UI 面板或新设备：** 01–04，然后直接阅读 [`docs/extending/`](../extending/README.md)。扩展指南相对完整，无需先读 05–12；添加第一个常量前建议先读[课程 10](10-topics-as-the-contract.md)。
- **开发 Route/建图后端：** 01–05、08。
- **维护或调试已部署系统：** 阅读全部课程；遇到故障时优先复习 11 和 12。
