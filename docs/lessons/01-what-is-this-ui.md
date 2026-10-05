# 课程 01 — 这是什么 UI？

| 适读对象 | 时间 | 前置条件 |
| --- | --- | --- |
| 操作员、开发者和维护者 | 8 分钟 | 操作员请先阅读[课程 00](00-your-first-10-minutes.md) |

## 学习目标

本课将介绍本仓库负责的内容、由机器人或仿真工作区负责的内容，以及为何网络安全和实体安全都不能只依赖浏览器。

## 一句话说明

OpenAMRobot UI 是一个浏览器控制台：它是一个 React 应用，用于查看和操作已在其他环境中运行的机器人，但它本身不负责运行机器人。

## 本仓库包含什么

- React 前端（`web/`），在浏览器中显示地图、相机画面、摇杆、路线编辑器和状态面板。
- 一组 ROS 2 节点（`ros2/src/openamr_ui_package/`），用于将浏览器接入 **ROS 2 graph**，也就是网络中所有正在运行的 ROS 2 节点组成的系统。节点会相互发现，并通过 topic、service 和 action 交换数据（这些术语见[课程 02](02-ros2-core-concepts.md)）。此工作区中的节点负责提供编译后的 React 应用、将 WebSocket 流量桥接到 ROS topic、通过 HTTP 串流相机图像，以及调整部分 topic，使浏览器客户端能够接收数据。

以上就是本仓库的职责。此工作区中的所有内容都是为了将机器人数据送入浏览器，并将 UI 操作传回机器人。理解下方术语后，请参阅[课程 03](03-how-the-browser-talks-to-ros.md#the-chain)中的完整 node/topic 示意图。

**完整数据链路示例：** 机器人工作区中的 Nav2 软件栈会通过 `/odom` 发布机器人位姿和速度。启动 UI 工作区后，Flask 将编译后的 React 页面提供给浏览器；浏览器与 rosbridge 建立 WebSocket（参见[课程 03](03-how-the-browser-talks-to-ros.md)）；随后，Map 页面的 `RobotState` 面板通过该连接订阅 `/odom`，并在屏幕上显示更新的数据。只有在机器人/仿真工作区已启动且正在发布 `/odom` 时，这条链路才有数据可用；否则 UI 无内容可显示。

## 本仓库不包含什么

- **不包含** Nav2、AMCL、地图服务器或定位/规划软件栈；这些组件在机器人或仿真工作区中运行。
- **不包含** 机器人驱动、电机控制器或传感器软件栈。
- **不包含** 仿真器。若使用 Gazebo，它也属于机器人/仿真工作区。
- 不负责任何描述实体机器人的 topic；本仓库只读取这些 topic，并在少数情况下将它们以 `/ui/*` 名称重新发布（见[课程 04](04-data-flow-and-relays.md)）。

<a id="the-two-workspace-model"></a>
## 双工作区模式

完整系统需要分别运行两个工作区：

| 工作区 | 示例路径 | 职责 |
| --- | --- | --- |
| 机器人或仿真工作区 | 例如 `~/openamr-platform-sw` | 机器人/仿真器、Nav2、定位、地图服务器、对接、传感器，以及描述实体机器人的全部 topic |
| 本 UI 工作区 | `~/openamrobot-ui`（本仓库） | 浏览器控制台、WebSocket 桥接、相机 Web 服务器和少量中继节点 |

应在机器人/仿真工作区之后启动 UI 工作区，让 UI 连接机器人工作区已发布的 topic 和 service。停止 UI 后，机器人仍会继续运行；UI 是查看和控制界面，不是机器人软件栈的依赖项。停止机器人工作区后，UI 会显示“disconnected”或过期数据，因为已没有可观察的数据来源。

## 源码中的对应位置

两层 ROS 2 launch 分别位于：
  [`ros2/src/openamr_ui_bringup/launch/ui.launch.py`](../../ros2/src/openamr_ui_bringup/launch/ui.launch.py)
  （推荐入口）以及
  [`ros2/src/openamr_ui_package/launch/new_ui_launch.py`](../../ros2/src/openamr_ui_package/launch/new_ui_launch.py)
  （实际启动 Flask、rosbridge、相机服务器和中继节点的文件）。两者都不会启动 Nav2、地图服务器或仿真器。

浏览器入口是
  [`web/src/index.jsx`](../../web/src/index.jsx)，它会挂载
  [`web/src/app/App.jsx`](../../web/src/app/App.jsx)。该文件负责建立整个应用与 ROS 共用的唯一连接。

## 安全提示：当前没有身份验证

此工作区不会检查连接者身份。整个链路没有登录、访问控制或用户权限机制：Flask 会向任何能够访问 `5050` 端口的浏览器提供页面，rosbridge 也会接受任何能够访问 `9090` 端口的 WebSocket 客户端发来的命令（见[课程 03](03-how-the-browser-talks-to-ros.md)）。网络上任何能够访问这些端口的人都可能操作机器人，就像亲自在控制台前操作一样。对于局域网内的操作控制台，这是一种可接受的取舍；但这意味着网络暴露范围就是访问控制。请将这些端口限制在可信网络中，并在向其他计算机开放之前审核防火墙、代理或端口转发设置。

## 安全提示：控制台停止功能不是实体急停

控制台上的红色控件会发布一次零值 `Twist`，并请求 Nav2 取消当前目标。该控件可用于操作员日常干预，但不会锁存、不具备安全认证，也不独立于 WiFi、浏览器、rosbridge 或机器人控制器。其他发布者也可能继续发送运动命令。操作真实硬件时，请确保经过验证的实体急停装置在伸手可及范围内，并遵守平台安全流程。
