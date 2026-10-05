# 课程 13——扩展系统

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 贡献者 | 8 分钟 | [课程 10](10-topics-as-the-contract.md)及对应页面课程 |

## 学习目标

了解应选择哪份实操扩展指南，以及如何确认新增页面或设备遵循现有系统契约。

读完课程 00–12 后，你已经掌握了理解本 UI 所需的整体模型：

- 浏览器 dashboard 通过 rosbridge 和 ROS 通信，并共用一个 connection（[课程 01](01-what-is-this-ui.md)、[课程 03](03-how-the-browser-talks-to-ros.md)）。
- Nodes、topics、messages、services、actions 和 launch files 是 ROS 的基础组成部分（[课程 02](02-ros2-core-concepts.md)）。
- 机器人侧 topic 的 QoS 不适合迟加入的 browser client 时，使用 robot topic → relay node → browser-safe topic 模式（[课程 04](04-data-flow-and-relays.md)）。
- `openamr_ui_package` 除 relay 外还运行 Flask web/API server 和 Route 页的两个 backend nodes（[课程 05](05-backend-nodes-in-detail.md)）。
- 了解所有页面以及它们使用的面板（[课程 06](06-the-pages.md)、[课程 07](07-ui-components.md)），并理解 Route 页背后的 group → map → route 文件层级（[课程 08](08-map-and-route-model.md)）。
- Topic names 是 UI 和机器人之间实际生效、但 compiler 不会检查的 interface，因此应集中定义（[课程 10](10-topics-as-the-contract.md)）。
- WiFi 断开或进程重启时，哪些内容会出错并自行恢复（[课程 11](11-failure-modes-and-reconnection.md)），以及各层调试时应使用哪些 `ros2` 命令（[课程 12](12-debugging-with-ros-cli.md)）。

以上内容足以开始三类扩展工作。以下指南都是实操说明，并引用了具体文件。若要直接选择指南，可查看[`docs/extending/README.md`](../extending/README.md)；[`docs/extending/worked-example-adding-a-sensor.md`](../extending/worked-example-adding-a-sensor.md)则用一个完整实例串联前两份指南。

## 为 UI 添加面板或页面

要新增页面，或在已有页面中增加独立 widget（例如新的 status readout 或 control），请遵循[`docs/extending/add-a-ui-panel.md`](../extending/add-a-ui-panel.md)。指南会介绍文件位置、route 注册方式、如何访问共享 ROS connection，以及应在哪个 constants file 添加 topic names。

## 连接外部设备

如果要让新的 sensor、actuator 或机器人侧 ROS topic 在浏览器中可见或可控，请遵循[`docs/extending/connect-external-device.md`](../extending/connect-external-device.md)。指南涵盖如何判断是否需要 relay（见[课程 04](04-data-flow-and-relays.md)）、在哪里注册 relay，以及如何在 panel 中呈现数据。

这些指南都针对新增功能，不要求改变现有页面的行为。

## 试一试

选一个小型扩展想法，先记录它对用户可见的用途、ROS topic/service/action contract、message type、安全影响、持久化需求，以及应该参考哪份指南，再创建文件。

**完成标准：**能找出最适用的指南，并列出在仿真以及（如适用）真实硬件上如何验证。

---

[← 课程 12](12-debugging-with-ros-cli.md) · [课程索引](README.md) · [前往扩展指南 →](../extending/README.md)
