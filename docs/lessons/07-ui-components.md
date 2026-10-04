# 课程 07——UI 组件详解

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| Frontend 开发者 | 20 分钟 | [课程 03](03-how-the-browser-talks-to-ros.md)和[课程 06](06-the-pages.md) |

## 学习目标

了解共享组件如何使用 ROS connection、应用框架如何让后台功能保持挂载，以及组件 state 存放在哪里。

[课程 06](06-the-pages.md)概览了所有页面。本课深入介绍 Map 和 Route 背后的共享面板：这两个页面由[`web/src/components/`](../../web/src/components/)中的小面板组合而成。我们会说明各面板显示什么、使用哪些 ROS 名称（除非另有说明，名称来自[`web/src/shared/constants/index.js`](../../web/src/shared/constants/index.js)）、目前由哪些页面渲染，以及从名称看不出的内部行为。Programs/Blockly 不是由这类面板组合而成，因此会在[课程 09](09-blockly-programming.md)单独介绍。

### 关于旧版 Control 页面的说明

早期版本的 UI 有单独的 Control 页面，现在已移除；手动驾驶、docking 和 telemetry 面板已并入 Map 页面（见[课程 06](06-the-pages.md#map--mappagejsx)）。下文的 `Joystick`、`DockingControl`、`NavStatus` 和 `SystemAlerts` 组件过去就在该页面中渲染。变化的是渲染它们的页面，而不是组件行为或使用的 topics。旧文档、issue 或代码注释中的 “Control page” 指的就是旧版页面。

## Quick reference

| 组件 | 是否与 ROS 通信 | 使用页面 |
| --- | --- | --- |
| [`Map`](#map--mapjsx) | Yes (indirectly, via NAV2D) | Map, Route |
| [`MapLayers`](#maplayers--maplayersjsx) | No | Map, Route |
| [`Camera`](#camera--camerajsx) | No (plain HTTP, not rosbridge) | Map, Status |
| [`Joystick`](#joystick--joystickjsx) | Yes | Map |
| [`NavStatus`](#navstatus--navstatusjsx) | Yes | Map |
| [`RobotState`](#robotstate--robotstatejsx) | Yes | Map (compact), Status |
| [`SystemHealth`](#systemhealth--systemhealthjsx) | Yes | Status, Health, Fleet (compact), Config (compact) |
| [`SystemAlerts`](#systemalerts--systemalertsjsx) | Yes | Map |
| [`LifecycleStatus`](#lifecyclestatus--lifecyclestatusjsx) | Yes | Health, Fleet (compact), Config (compact) |
| [`DockingControl`](#dockingcontrol--dockingcontroljsx) | Yes | Map (compact) |
| [`Header`](#header--headerjsx) | Reads status only | Every page (via `AppLayout`) |
| [`Logs`](#logs--logsjsx) | Yes | Every page (floating diagnostics-console drawer — a different thing from the dedicated [Console page](06-the-pages.md#console--consolepagejsx)) |
| [`TimeModal`, `RouteModal`, `TextInputModal`](#the-route-page-modals) | No (delegate to Route page) | Route |
| [`ControlSwitcher`, `CircularProgressBar`, `FilesModal`, `Topics`](#components-not-currently-used) | — | None (not wired into any page) |

## Map — `Map.jsx`

这是“界面看起来做的事”和“组件实际负责的事”差异最大的组件。`Map.jsx` 本身几乎不直接处理 ROS，主要是作为 React wrapper，封装[`web/index.html`](../../web/index.html)加载的 `ros2d.js`/`nav2d.js` imperative 浏览器库（见[课程 03](03-how-the-browser-talks-to-ros.md)）。组件挂载时会创建 `ROS2D.Viewer` canvas，并将共享 `ros` connection 传给全局调用 `window.NAV2D.InitMap(ros)`。此后地图网格、laser scan、costmap、path 和 trail 都由该库自行订阅 topics 并渲染，不属于 React state；收到新 map data 时 `Map.jsx` 不会重新渲染。地图角落的 zoom 和 pan 按钮会直接在同一 viewer 上调用 `ROS2D.ZoomView`/`canvas.shift()`。

`Map.jsx` 通过 React/ROS 直接处理两件事：连接时向 `AppConfig.WP_REQ`（`/WP_req`）发布一次空消息，作为“请发送当前 waypoints”的 trigger；并订阅 `AppConfig.MAP_TOPIC`（`/ui/map`），只用于更新内部计数器以触发重新渲染。真正的 occupancy grid data 由 NAV2D 自行读取。组件还通过 `ref` 暴露 `getMapRef()` handle，Route 页面会用它注册 `mouseup` listener 来放置 waypoint，见[`web/src/pages/RoutePage.jsx`](../../web/src/pages/RoutePage.jsx)。

## MapLayers — `MapLayers.jsx`

它只是 settings panel，不持有 ROS connection，也不会调用 `useRos()`。checkboxes/sliders 会更新 7 个图层（map、costmap、laser scan、path、goal、waypoints、trail）的本地 React state，并调用 `window.NAV2D.setLayerVisible()`/`setLayerOpacity()`；这是 `Map.jsx` 初始化的同一个全局对象。这也说明了[课程 06](06-the-pages.md#the-pattern-across-every-page)所说“每个页面读取共享 ROS connection”的适用范围：页面如此，但如果面板无需发布或订阅，单个面板可以完全不访问 ROS。

## Camera — `Camera.jsx`

它也不使用 rosbridge。如[课程 03](03-how-the-browser-talks-to-ros.md#the-camera-stream-is-a-third-separate-path)所述，它会创建普通的 `<img>`，指向 `web_video_server` 的 HTTP MJPEG endpoint，并使用 `AppConfig.CAMERA_PORT` 及所选 `CAMERA_TOPIC_OPTIONS`。画质选择器（low/balanced/high）只会调整发送给 `web_video_server` 的 JPEG quality/width/height query parameters，是客户端的 stream 设置，不会向 ROS 发布内容。

## Joystick — `Joystick.jsx`

它只向 `AppConfig.CMD_VEL_TOPIC`（`/cmd_vel`）发布消息，不进行订阅。拖动期间每隔 100&nbsp;ms 重新发布当前摇杆位置（不只在位置变化时发布），松开时再发布一条零速度消息。`maxSpeed` prop（由 Map 页的 speed slider 传入）会缩放 `linear.x`；`angular.z` 始终使用固定的 `AppConfig.MAX_ANGULAR_SPEED` 缩放，不能针对单个实例调整。

## NavStatus — `NavStatus.jsx`

它订阅 `AppConfig.NAV_STATUS_TOPIC`（goal status）和
`AppConfig.NAV_FEEDBACK_TOPIC`（剩余距离 feedback），对应[课程 02](02-ros2-core-concepts.md#action)介绍的 action。它保留最近 5 条 terminal status 变化，并按 goal ID 去重，避免重复记录已完成的 goal。成功、取消或失败后 1 秒清除绘制的路径（`window.NAV2D.clearPath()`），3 秒后重置状态标记。`Cancel` 按钮本身不调用 cancel service，而是执行通过 prop 传入的 `onCancelGoal` callback；真正调用 `AppConfig.NAV_CANCEL_GOAL_SERVICE` 的 `ROSLIB.Service` 由 Map 页面持有。这样每个页面只创建一个 cancel-service client。Map 页顶部的 E-STOP 按钮（[`StatusBar.jsx`](06-the-pages.md#the-chrome-thats-on-every-page)）也会在此组件之外调用同一 service。这是一次性软件干预，不是锁存式或安全等级的物理 emergency stop。

## RobotState — `RobotState.jsx`

此文件将组件以 `State` 名称导出，渲染 Velocity 和 Position 两个 stats cards。Velocity 始终来自 `AppConfig.ROBOT_POSE_TOPIC`（`/odom`）。
Position 优先使用 `AppConfig.AMCL_POSE_TOPIC`（标记显示 “Map-corrected”，悬停提示为 “AMCL”）；首条 AMCL message 到达前，则回退到 odometry 的 position field（标记显示 “Estimated”，提示为 “Odometry”）。因此，该标记可以实时反映 localization 是否正在发布数据。此组件引用 `three`（Three.js）package，只使用 `Euler`/`Quaternion` class 将 quaternion 换算成 yaw angle；这里没有 3D rendering。

## SystemHealth — `SystemHealth.jsx`

这是最详细的诊断面板。它订阅 7 个 streaming topics
（laser scan、odom、AMCL、Nav2 status、map、global costmap、plan），并按实际需要设置各 topic 的 `throttle_rate`（scan 每 1 秒、map/costmap 每 3 秒、其他每 500 ms 检查一次）。这只会限制 health bookkeeping 的频率，不影响其他 subscriber 收到的数据。它还会订阅 `/tf` 和 `/tf_static`，重建已收到的 parent→child frame links，并每秒检查三条固定 link：`map->odom`、`odom->base_link`、`base_link->lidar_link`。只有在配置的 timeout 内收到 message，topic 才会标为 “online”；它也会跟踪滚动 Hz 估算值，并在非紧凑视图显示。Status 和 Health 页面显示完整版本，Fleet 和 Config 显示紧凑版本。

## SystemAlerts — `SystemAlerts.jsx`

这是面向用户的精简版 `SystemHealth`：状态正常时不显示任何内容
状态正常时不显示内容，只有特定数据过期时才出现小横幅：map、AMCL pose、plan data 过期或 rosbridge 断开。与 `SystemHealth` 的综合诊断不同，plan 过期在这里标记为 `warningOnly`（黄色）；map/AMCL 过期和 rosbridge 断开则始终按 error 处理（红色）。仅在 Map 页面渲染，不在 Route、Status、Health、Fleet 或 Config 显示。

## LifecycleStatus — `LifecycleStatus.jsx`

列表中的每个节点（`map_server`、`amcl`、`controller_server`、`planner_server`、`bt_navigator`）每 3 秒查询一次 `get_state`。UI 中分别显示为 “Map data”、“Position tracking”、“Driving control”、“Path planning” 和 “Navigation logic”，悬停时可查看原始 node 名称。此外，每个 node 都会创建一个 `change_state` service client，对应 UI 中的 “Prepare”/“Start”/“Pause”/“Reset” 四个按钮。按钮会同时对全部五个 nodes 调用 `change_state`，并使用固定 transition ID（`configure=1`、`cleanup=2`、`activate=3`、`deactivate=4`，即真实的 `lifecycle_msgs` transition IDs）。它不会等待或处理各 node 的响应；显示状态只在下一次 3 秒轮询时更新，因此点击后会有短暂延迟。Pause/Reset 可能直接停止 navigation，执行前会调用 `window.confirm()`；Prepare/Start 属于启动操作，不会询问。紧凑和完整视图中都有 “?” 开关，会用通俗语言解释 `active`/`inactive`/`unconfigured`/`unknown` 状态。

## DockingControl — `DockingControl.jsx`

它主要根据订阅到的数据呈现状态，而不是依靠自身按钮点击。`Dock`/`Undock` 只向 `AppConfig.DOCK_TRIGGER_TOPIC`/`UNDOCK_TRIGGER_TOPIC` 发布一个 boolean；可见状态（idle/docking/docked/undocking/failed）完全来自对 `AppConfig.DOCK_TRIGGER_STATUS_TOPIC` 的订阅。它还会在一种情况下监听 `AppConfig.NAV_STATUS_TOPIC`：undocking 完成后，向固定 pose（组件中写死的 `x=0, y=0, yaw=0`）发布 “standby” goal，并等待 standby navigation 成功或失败，再回到 idle。非紧凑视图会保留最近 5 条事件。

## Header — `Header.jsx`

它从[`web/src/pages/registry.js`](../../web/src/pages/registry.js)读取导航项目，使用[课程 06](06-the-pages.md)介绍的 `PAGE_REGISTRY` array，而不是 hardcoded list。它还通过 `useRosStatus()`显示 rosbridge 状态点，并提供由 `localStorage` 保存的浅色/深色主题切换。**Console** 按钮不保存抽屉的开关状态；该状态位于[`web/src/layouts/appLayout.jsx`](../../web/src/layouts/appLayout.jsx)，由此处通过 props 向下传递 `showLogs`/`onToggleLogs`，因此 `Header` 仍是纯显示组件。

不要与侧边栏中的独立 [Console 页面](06-the-pages.md#console--consolepagejsx)混淆：两者名称相同，但功能不同。Header 的 `Console` 按钮会打开小型浮动抽屉（下文的 `Logs`），显示 UI 级 message 历史记录，所有页面均可访问。侧边栏的 Console 是完整页面，包含实时 `/rosout` viewer 和 topic-echo panel。

## Logs — `Logs.jsx`

该组件以 `RobotLog` 名称导出，并在所有页面的 `AppLayout` 浮动 “System Diagnostics Console” 抽屉中渲染（通过 Header 的 `Console` 按钮打开）。它订阅 `AppConfig.UI_MESSAGE_TOPIC`，并将每条 message 追加到 Redux store（见[`web/src/stores/index.js`](../../web/src/stores/index.js)），而不是保存在组件本地 state。这是本课介绍的唯一一个集中保存数据、而非使用 `useState` 的组件，因此即使 `Logs` 卸载再挂载，抽屉仍会保留历史记录。

## The Route page modals

三个小型对话框，只由[`web/src/pages/RoutePage.jsx`](../../web/src/pages/RoutePage.jsx)渲染，都不会直接访问 ROS。它们只负责收集输入并调用 `modalHandler(data)` prop，之后真正发布消息的是 Route 页面。

- **`TimeModal.jsx`**——在 Create/Edit mode 将 waypoint 放到地图时填写小时和分钟（范围分别为 0–23/0–59）。`RoutePage.jsx` 中连接到它的 handler 带有源码注释 `// TODELETE`，并直接调用 `window.NAV2D.sendPointToRobot(ros, data)`。目前仍属于实际流程，但注释说明维护者认为它需要清理，继续基于此实现扩展前应先与维护者确认。
- **`RouteModal.jsx`**——用于 `Change` 的单层列表选择器，可浏览并选择已有 route。
- **`TextInputModal.jsx`**——用于 `Save` 和 `Rename` 的名称输入框，内置 route 命名规则（不能包含下划线、不能使用 `Null`/`New route` 等保留名称，也不能重复）。

## Components not currently used

代码库中有四个组件目前未被任何页面或其他组件导入。了解这一点可以避免误以为它们正在使用，也有助于判断是否应复用，而不是从头新增类似组件：

- **`ControlSwitcher.jsx`**——通用 on/off switch，根据 prop 传入的 topic name 发布两个 string values 之一，可作为简单 toggle panel 的复用组件。
- **`CircularProgressBar.jsx`**——带标签的圆形 gauge，解析 `"name_value"` 格式的 string，并按 min/max range 显示百分比。
- **`modal/FilesModal.jsx`**——三级 group → map → route 浏览/选择器，功能覆盖 `RouteModal.jsx` 当前实现。
- **`Topics.jsx`**——占位 panel，只显示 “Coming soon.”。

## The app shell: routing, providers, and state

上文介绍的内容都渲染在页面*内部*。本节介绍更上层的结构：与 ROS 无关、专门用于组织 React app 的 frontend 部分。

**Routing。**[`web/src/pages/index.jsx`](../../web/src/pages/index.jsx)根据[`pages/registry.js`](../../web/src/pages/registry.js)生成 route table（添加页面的步骤见[`docs/extending/add-a-ui-panel.md`](../extending/add-a-ui-panel.md)）。所有 routes 都嵌套在[`web/src/layouts/appLayout.jsx`](../../web/src/layouts/appLayout.jsx)下，由它渲染 `Header` 和当前页面，并管理 floating console drawer 的开关状态，再通过 props 传给 `Header`（见上文[Header](#header--headerjsx)）。

**始终与当前页面一同挂载。**`AppLayout` 还会渲染一些不属于某个页面、切换页面时仍保持挂载的组件：`StatusBar`（battery + E-STOP，见[课程 06](06-the-pages.md#the-chrome-thats-on-every-page)）；`NotificationsWatcher` 和 `EventRecorder`（分别为浏览器通知及[Events 页面](06-the-pages.md#events--eventspagejsx)提供数据）；`SchedulerRunner` 和 `MissionRunner`（分别执行[Scheduler](06-the-pages.md#scheduler--schedulerpagejsx)和[Missions](06-the-pages.md#missions--missionspagejsx)页面配置的任务，即使离开创建任务的页面也会继续运行）；`DemoModeBanner`/`ReplayModeBanner`/`AuthModeBanner`；以及 `HelpWidget`/`OnboardingWizard`。这些组件只创建完成自身工作所需的 ROS subscriptions。说明它们是为了回答“为什么切到其他页面后它还在运行”。

**Providers。**[`web/src/app/App.jsx`](../../web/src/app/App.jsx)通过 `withProviders` wrapper 导出，该 wrapper 在[`web/src/app/providers/index.js`](../../web/src/app/providers/index.js)中定义为 `compose(withBoundary, withRouter, withStore)`。渲染树从外到内依次为：error boundary → router → Redux store provider → `App`。error boundary 放在最外层是有意设计的，这样才能捕获树中其他位置（包括 routing 内部）的崩溃。

**State management：两种机制，各有用途。**本课介绍的大多数面板使用普通的 `useState`/`useRef` 保存自己的 state；新增面板也应优先采用这种方式（见[`add-a-ui-panel.md`](../extending/add-a-ui-panel.md)）。例外是[`Logs.jsx`](#logs--logsjsx)，它会 dispatch 到小型 Redux store（[`web/src/stores/index.js`](../../web/src/stores/index.js)，由[`web/src/app/store/index.js`](../../web/src/app/store/index.js)接入），其中只有一个 state slice：log message list。Redux 在此代码库中用于保存需要跨面板卸载和重新挂载而保留的集中状态，并非每个新面板都应使用的通用模式。

**Error boundary。**
[`web/src/app/ErrorBoundary/ErrorBoundary.jsx`](../../web/src/app/ErrorBoundary/ErrorBoundary.jsx)
如果树中任意组件在 render 期间抛出错误，此组件会显示 fallback UI（“Something went wrong”及返回 `/` 的链接）。它只捕获 render-time errors（React 的 `componentDidCatch`），不捕获 event handlers 或 `ROSLIB` callbacks 中的错误；`.subscribe()` callback 抛出异常不会触发它。

**Theme。**`Header` 中的浅色/深色切换由 `ThemeContext` 管理，它与 `RosContext` 一起定义在 `App.jsx` 中，并持久保存到 `localStorage`。它使用与[课程 03](03-how-the-browser-talks-to-ros.md)相同的 React context 机制，只是传递 UI preference，而不是 ROS connection。

## 试一试

选择一个 Map 面板，追踪其 page import、ROS topic constant、subscription 或 publisher、cleanup function，以及最终渲染的状态。

**完成标准：**能添加只读面板，而不创建第二个 ROS connection，也不遗留未清理的 subscription。

## 下一课

[课程 08——Map 和 Route 文件模型](08-map-and-route-model.md)会深入介绍 Route 页面背后的 group/map/route 文件层级，以及 `RoutePage.jsx` 和 `folders_handler.py` 如何使用它；随后[课程 09——Blockly 可视化编程](09-blockly-programming.md)会深入介绍第五个页面 Blocks。

---

[← 课程 06](06-the-pages.md) · [课程索引](README.md) · [下一课：课程 08 →](08-map-and-route-model.md)
