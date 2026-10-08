# 扩展 RobotPilot UI

本目录提供向 UI 添加功能的实操指南，不会改变现有页面的行为。如果尚未阅读概念课程，
请先从 [`docs/lessons/`](../lessons/README.md) 开始；这些指南假设你已了解 topic、中继节点和共享 ROS 连接。

## 我应该看哪篇指南？

| 目标 | 指南 |
| --- | --- |
| 添加新页面，或在现有页面添加状态/控制组件 | [`add-a-ui-panel.md`](add-a-ui-panel.md) |
| 将新传感器、执行器或 ROS topic 接入浏览器 | [`connect-external-device.md`](connect-external-device.md) |
| 从头到尾查看上述工作的完整示例 | [`worked-example-adding-a-sensor.md`](worked-example-adding-a-sensor.md) |

添加一个**用于显示新设备数据的面板**通常需要结合前两篇指南：先在
`connect-external-device.md` 中确定 topic 和中继节点，再按 `add-a-ui-panel.md` 实现面板。
完整示例会以一个具体案例演示这两部分如何配合。

## 本指南未涵盖的内容

这些指南只介绍新增功能，不涉及修改现有页面或面板的行为。如需更改已有功能，请先阅读相关课程
（页面见[课程 06](../lessons/06-the-pages.md)，单个面板见[课程 07](../lessons/07-ui-components.md)），确保改动与代码库其他部分一致，
然后直接修改源码；目前没有专门介绍如何修改既有行为的指南。
