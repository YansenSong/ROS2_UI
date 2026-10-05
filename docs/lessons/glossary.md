# 术语表

[课程](README.md)中出现的术语集中列在此处，便于快速查找。每项均链接到详细说明所在的课程；本页只提供简要定义。

**Action**——用于长时间、可取消任务的 ROS 2 goal/feedback/result 交互，例如 `navigate_to_pose`。见[课程 02](02-ros2-core-concepts.md#action)。

**Active context**——Route 页面当前选中的唯一 map 和 route，记录在 `current_map_route.yaml` 中。见[课程 08](08-map-and-route-model.md#active-context-始终只有一个文件)。

**AMCL（Adaptive Monte Carlo Localization）**——Nav2 node，通过将实时 LIDAR scans 与 map 对比来估算机器人的位置，并发布 `/amcl_pose`。Map 和 Status 页面会显示 “Map-corrected” position badge（悬停时提示 “AMCL”）；Health 页面会用它检查 localization。见[`RobotState`](07-ui-components.md#robotstate--robotstatejsx)和[`SystemHealth`](07-ui-components.md#systemhealth--systemhealthjsx)。

**`AppConfig`**——`web/src/shared/constants/index.js` 导出的 object，包含 frontend 依赖的 topic/service/action names。见[课程 10](10-topics-as-the-contract.md)。

**Behavior Tree（`bt_navigator`）**——Nav2 lifecycle node，将 navigation 编排为一组条件步骤，例如计算路径、跟踪路径，发生问题时运行 recovery behavior，而不是执行单一固定算法。它是 Lifecycle panel 跟踪的五个 nodes 之一。见下方 **Lifecycle node** 和[`LifecycleStatus`](07-ui-components.md#lifecyclestatus--lifecyclestatusjsx)。

**Contract（topics as the contract）**——topic name 和 message type 共同构成 UI 与机器人之间的 interface，但 compiler 不会检查它们是否一致。见[课程 10](10-topics-as-the-contract.md)。

**Costmap**——叠加在 map 上的网格，每个 cell 的值反映其与障碍物的距离；Nav2 会规划路径避开高 cost 的区域。Nav2 维护覆盖全图的 global costmap 和只覆盖机器人周边的 local costmap。Map 页分别以 “Obstacles (wide)” 和 “Obstacles (near)” 图层显示，旧版 UI 标为 “Costmap G” 和 “Costmap L”。见[`MapLayers`](07-ui-components.md#maplayers--maplayersjsx)。

**DDS（Data Distribution Service）**——ROS 2 使用的 pub/sub middleware。它负责 nodes 之间的发现，以及 topics、services、actions 的交换，无需 central broker。Node 重启后通常会自动重新加入 graph。它与浏览器 rosbridge WebSocket 的重连不同；后者是 UI 自行实现的 application-level retry。见[课程 11](11-failure-modes-and-reconnection.md)。

**Durability（QoS）**——ROS 2 Quality of Service 设置，控制晚加入的 subscriber 是否能收到上次发布的 message（`TRANSIENT_LOCAL`），还是只能收到之后的新消息（`VOLATILE`）。见[课程 04](04-data-flow-and-relays.md#问题出在-qos而不是代码)。

**Error boundary**——React component，捕获其子树渲染期间发生的错误，并显示 fallback UI，避免页面崩溃后变成空白。它只捕获 render errors，不捕获 event handlers 或 `ROSLIB` callbacks 中的错误。见[课程 07](07-ui-components.md#应用框架routingproviders-和-state)。

**Flask**——提供编译后的 React app 和小型 REST API 的 Python web server；它本身也是 ROS 2 node。见[课程 05](05-backend-nodes-in-detail.md#flask_apppy--two-unrelated-jobs-in-one-process)。

**Group / Map / Route hierarchy**——已保存 maps 和 routes 使用的三级结构（`Group → Map → Route`）。见[课程 08](08-map-and-route-model.md)。

**Launch file**——同时启动一组 ROS 2 nodes 并加载配置的 Python script。见[课程 02](02-ros2-core-concepts.md#launch-file)。

**Lifecycle node**——运行状态由明确的 `get_state`/`change_state` service calls 管理的 ROS 2 node；它不会像普通 node 一样启动后立即工作。Nav2 的 `map_server`、`amcl`、`controller_server`、`planner_server` 和 `bt_navigator` 都使用 lifecycle。见[`LifecycleStatus`](07-ui-components.md#lifecyclestatus--lifecyclestatusjsx)。

**Message**——通过 topic 传输的 typed data structure，例如 `geometry_msgs/Twist`。见[课程 02](02-ros2-core-concepts.md#message)。

**Nav2**——ROS 2 Navigation stack，由一组 lifecycle nodes（`map_server`、`amcl`、`controller_server`、`planner_server`、`bt_navigator`）组成，可根据 goal pose 生成避障行驶路径。它是 `navigate_to_pose`、`compute_path_to_pose` 和 Lifecycle panel 背后的系统。见[课程 02](02-ros2-core-concepts.md#action)和[`LifecycleStatus`](07-ui-components.md#lifecyclestatus--lifecyclestatusjsx)。

**Node**——一个运行中的 ROS 2 process，负责一项工作，并通过 ROS 2 middleware 被其他 nodes 发现和连接。见[课程 02](02-ros2-core-concepts.md#node)。

**Provider**——本代码库中提供应用级 context 的小型 wrapper component（`withRouter`、`withStore`、`withErrorBoundary`），向其内部组件提供 routing、Redux store 或 error handling。它们组合定义在 `web/src/app/providers/index.js`。见[课程 07](07-ui-components.md#应用框架routingproviders-和-state)。

**QoS（Quality of Service）**——附加到 ROS 2 topic 的数据传递行为设置，本 UI 主要关注 durability。见[课程 04](04-data-flow-and-relays.md#问题出在-qos而不是代码)。

**React context**——React 提供值并供组件树下方读取的机制，无需逐层手动传递 props；本 UI 用它让所有面板共用 ROS connection。见[课程 03](03-how-the-browser-talks-to-ros.md)。

**Redux store**——本代码库的集中 frontend state，只有一个 slice：由 `Logs.jsx` 写入的 console log message list。大多数面板使用普通 `useState`/`useRef`，不需要 Redux。见[课程 07](07-ui-components.md#应用框架routingproviders-和-state)。

**Relay（relay node）**——小型 ROS 2 node，将机器人侧的 `TRANSIENT_LOCAL` topic 以 `VOLATILE` 方式转发到 `/ui/` 前缀的 topic，确保 browser client 能收到数据。见[课程 04](04-data-flow-and-relays.md)。

**Reliability（QoS）**——QoS 的独立维度，取值为 RELIABLE 或 BEST_EFFORT，决定丢包后是否重试，不是本 UI relay 模式关注的重点。见[课程 04](04-data-flow-and-relays.md#问题出在-qos而不是代码)。

**`ROSLIB.Ros`**——在 `App.jsx` 中创建的唯一共享 roslibjs connection object，通过 `useRos()` 提供给各面板。见[课程 03](03-how-the-browser-talks-to-ros.md)。

**ROS 2 graph**——网络中当前运行的全部 ROS 2 nodes 的集合；它们能够互相发现并交换 topics/services/actions。见[课程 01](01-what-is-this-ui.md)。

**rosbridge（`rosbridge_websocket`）**——暴露 WebSocket endpoint 的 ROS 2 node（默认端口 `9090`），让浏览器通过 roslibjs 发布、订阅和调用 services。见[课程 03](03-how-the-browser-talks-to-ros.md)。

**roslibjs**——通过普通 `<script>` 标签加载的 JavaScript client library，使用 WebSocket 与 rosbridge protocol 通信。见[课程 03](03-how-the-browser-talks-to-ros.md)。

**Service**——ROS 2 request/response 调用：一个 request 对应一个 reply，从调用者角度看是同步操作。见[课程 02](02-ros2-core-concepts.md#service)。

**TF（transform tree）**——ROS 2 用于跟踪 coordinate frames 随时间如何相互关联的机制，例如 LIDAR 相对 robot base 的位置，以及 robot base 相对 map 的位置。Health 和 Status 页面检查 `map → odom → base_link → lidar_link` 这条 chain；任何 link 中断都会影响 localization 和 navigation。见[`SystemHealth`](07-ui-components.md#systemhealth--systemhealthjsx)。

**Three-stage build pipeline**——解释为什么只编辑 `web/src` 不会改变 Flask 提供的内容：`npm run build` 将代码编译到 `web/build/`；`sync_frontend_to_ros.sh` 将其复制到 ROS package source；`colcon build` 再安装到 Flask 实际读取的 share directory。见[课程 05](05-backend-nodes-in-detail.md#flask_apppy--two-unrelated-jobs-in-one-process)。

**Topic**——带名称和类型的 message stream，任一 node 都可以发布或订阅。见[课程 02](02-ros2-core-concepts.md#topic)。

**Two-workspace model**——机器人/仿真工作区负责 robot、Nav2 和 sensors；本 UI 工作区负责 dashboard、rosbridge 和 relays。见[课程 01](01-what-is-this-ui.md#the-two-workspace-model)。

**URDF（Unified Robot Description Format）**——描述机器人实体结构（links、joints、geometry）的 XML 文件格式。

**`useRos()` / `useRosStatus()`**——`App.jsx` 导出的两个 hooks，供面板访问共享 connection 及其状态，避免每个面板分别创建 connection。见[`docs/extending/add-a-ui-panel.md`](../extending/add-a-ui-panel.md)。

**`/ui/` prefix**——relay topic 的命名约定（`/ui/map`、`/ui/amcl_pose` 等），用于与机器人原始 topic 区分。见[课程 04](04-data-flow-and-relays.md#命名约定)。

**`web_video_server`**——将 ROS image topics 暴露为普通 MJPEG stream 的 HTTP server，是 Camera panel 使用的独立数据链路，不经过 rosbridge。见[课程 03](03-how-the-browser-talks-to-ros.md#the-camera-stream-is-a-third-separate-path)。
