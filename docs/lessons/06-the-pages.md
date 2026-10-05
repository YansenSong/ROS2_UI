# 课程 06——所有页面导览

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 操作员和 UI 贡献者 | 25 分钟 | [课程 00](00-your-first-10-minutes.md)和[课程 01](01-what-is-this-ui.md) |

## 学习目标

了解不同任务应使用哪个页面、哪些控件会使机器人移动，以及哪些页面依赖可选的后端辅助节点或浏览器侧状态。

这个 UI 的大多数页面都遵循[课程 03](03-how-the-browser-talks-to-ros.md)介绍的相同模式：读取唯一的共享 ROS connection，订阅或发布若干命名 topics，并显示收到的数据。了解几个页面后，其他页面也能用同样的方式理解。

本课逐一概览各页面的用途、可操作的控件和依赖的 topics。Map/Route 背后的各个面板详见[课程 07](07-ui-components.md)；group → map → route 文件模型详见[课程 08](08-map-and-route-model.md)。

所有页面都在[`web/src/pages/registry.js`](../../web/src/pages/registry.js)注册为 route。侧边栏也由该文件生成，因此要让新页面显示在应用中，只需在这里注册。若要添加页面，请参阅[`docs/extending/add-a-ui-panel.md`](../extending/add-a-ui-panel.md)。

## The chrome that's on every page

无论当前打开哪个页面，都能看到以下三项内容。它们由[`web/src/layouts/appLayout.jsx`](../../web/src/layouts/appLayout.jsx)渲染在页面上方，因此下面每张截图中都会出现：

- 顶部栏（`Header.jsx`）：侧边栏导航、connection 状态点（“Connected”/“Disconnected”）和浅色/深色主题切换。
- 下方的状态栏（`StatusBar.jsx`）：实时 battery 百分比和红色 **E-STOP** 按钮。该按钮会将 `/cmd_vel` 归零并取消当前 Nav2 goal，在任何页面都可使用，不只限于 Map。它是非锁存的软件停止功能，不能替代物理 emergency stop。
- 当前适用的横幅：播放[录制内容](#recordings--recordingspagejsx)时显示 replay 横幅；也可能显示 auth-mode 横幅（见[课程 01](01-what-is-this-ui.md#a-safety-note-there-is-no-authentication)的说明）。

## 页面速查

| 类别 | 页面 |
| --- | --- |
| 操作机器人 | [Map](#map--mappagejsx)、[Routes](#routes--routepagejsx)、[Maps](#maps--mapspagejsx)、[Scheduler](#scheduler--schedulerpagejsx)、[Missions](#missions--missionspagejsx) |
| 查看机器人状态 | [Status](#status--infopagejsx)、[Devices](#devices--devicespagejsx)、[Health](#health--healthpagejsx)、[Metrics](#metrics--metricspagejsx)、[Recordings](#recordings--recordingspagejsx)、[Events](#events--eventspagejsx) |
| 系统管理 | [Console](#console--consolepagejsx)、[Parameters](#parameters--paramspagejsx)、[Config](#config--configpagejsx) |

## 按任务查找页面

| 任务 | 从这里开始 | 操作前检查 |
| --- | --- | --- |
| 手动驾驶或发送单个 goal | [Map](#map--mappagejsx) | 物理 E-stop、周围空间、pose 和 map 是否为最新 |
| 创建或运行可复用 route | [Routes](#routes--routepagejsx) | group/map/route 是否正确，以及可选 helper 是否已启动 |
| 更换或创建 map | [Maps](#maps--mapspagejsx) | 当前 localization 状态及 map server 的管理状态 |
| 自动执行一系列任务 | [Scheduler](#scheduler--schedulerpagejsx)或[Missions](#missions--missionspagejsx) | 浏览器标签页保持打开、connection 数据新鲜、运动区域安全 |
| 了解警告原因 | [Health](#health--healthpagejsx)、[Events](#events--eventspagejsx)，再查看[Console](#console--consolepagejsx) | connection 状态与 topic 数据新鲜度是不同信号 |
| 修改机器人参数 | [Parameters](#parameters--paramspagejsx) | 确认机器人和节点，并先记录旧值 |

## Map — `MapPage.jsx`

主要操作页面，将环境态势信息和手动驾驶控件放在一起。（过去有单独的 Control 页面；其驾驶、docking 和 telemetry 面板现已移到这里，见[课程 07](07-ui-components.md#a-note-on-the-old-control-page)的说明。）


- map panel 显示 occupancy grid、robot pose 及可选叠加层（costmaps、laser、path、goal、waypoints、keep-out zones、trail）；可通过 `LAYERS` 行分别调整每层的 opacity。
- **Send Goal**（旧版 UI 称为 “Goal Mode”）会发布 navigation goal：点击地图即可发送目标，也可在松开前拖动以设置 heading。**Correct Robot's Position**（旧版称为 “Set Pose”）会单次发布 `/initialpose` correction，可用于 localization 漂移或重置后校正机器人自身定位。此操作的名称和样式与旁边的 navigation modes 明确区分，因为它校正定位，不会发送导航目标。**Add Waypoint** 可排入多个 goals，再通过 **Execute Queue** 按顺序执行。**Go Home** 会将机器人发送到 `(0, 0)`。
- 右键点击地图可以直接执行相同的三种操作（发送 goal、保存 waypoint、修正机器人位置），无需先切换模式。
- 控件行包含带独立 **STOP** 按钮的手动 joystick、带快捷预设的最高速度 slider、实时速度/位置（紧凑版 `RobotState`）、dock/undock 控件及状态（紧凑版 `DockingControl`），以及已保存的 waypoint 列表（可导航到某点，或保存机器人当前位置）。
- 顶部的 `SystemAlerts` 只会在特定数据过期时显示，例如 map、localization、plan 或 connection。没有警报表示状态正常，并非功能缺失。

## Routes — `RoutePage.jsx`

Route 编辑页面：为指定 map 创建和管理可复用的命名 waypoint 序列，与 Map 页面一次性的 goal 不同。


- `GROUP` / `MAP` / `CURRENT ROUTE` 标题会显示当前编辑的 route。保存前请先确认，因为 route 只适用于创建它的 map（见[课程 08](08-map-and-route-model.md)）。
- **Create** 新建 route，点击地图即可放置 waypoints。**Edit** 重新打开当前 route 以便修改。**Switch route**（旧版称为 “Change”）选择另一条已保存的 route。**Switch map**（旧版称为 “Change map”）切换所用 map。两项操作现使用不同名称，因为切换 map 的影响远大于切换 route。**Auto-plan** 会让 Nav2 计算两点之间的路径，并自动转换为 waypoints。**Save**、**Rename** 和 **Delete** 操作当前 route；**Clear waypoints**（旧版称为 “Clear points”）只清除正在编辑的内容。
- 它通过 `/nav_data_req`、`/nav_data_resp` 和 `/ui_operation` 与 `folders_handler` backend node 交换文件状态。只有启动可选的
  [`physnode_launch.py`](../../ros2/src/openamr_ui_package/launch/physnode_launch.py)
  helper is running (see [Lesson 05](05-backend-nodes-in-detail.md)).

## Maps — `MapsPage.jsx`

Map 管理页面：从头创建新 map、保存当前加载的 map，并将已保存的 maps 分组管理。


- **Start mapping** 会启动 mapping mode（SLAM）并停止 navigation/localization。使用 Map 页的 joystick 等方式驾驶机器人探索环境，完成后返回此处点击 **Save current map**。
- 在已保存 maps 列表中可 **Switch** 当前 map（会立即在机器人上重新加载；由于旧 localization 不适用于新 map，之后要重新设置 initial pose）、**Rename** 或 **Delete** map，也可以添加或删除 groups。
- 此页面与 Routes 页面使用相同的 `folders_handler` node 和 `/ui_operation` protocol（见
  Routes page uses (see [Lesson 05](05-backend-nodes-in-detail.md) and
  [Lesson 08](08-map-and-route-model.md)) — this page is what finally
  exposes that node's mapping functions through an actual button, rather
  than requiring a raw topic publish.

## Scheduler — `SchedulerPage.jsx`

在每天指定时间触发 navigation。


- schedule 包含名称、执行时间、重复方式（`Daily` 或 `Once`）和目标：回到 home、导航到已保存的 waypoint，或运行完整的
  [mission](#missions--missionspagejsx).
- 可启用/停用 schedule 而不删除；也可以直接删除。
- 页面说明也清楚指出：任务由
  [`SchedulerRunner`](../../web/src/components/SchedulerRunner.jsx), a
  component mounted in `AppLayout` that only runs while a browser tab with
  this UI open is actually open. It is a convenience scheduler, not
  robot-side cron — closing every tab stops it from firing.

## Missions — `MissionsPage.jsx`

将多个操作按顺序串成一组（例如导航到某处、等待、dock），并以一个 “mission” 运行。


- mission 是有序的 step list：前往已保存的 waypoint、回到 home、等待 N 秒、dock 或 undock。可用上下箭头调整顺序，也可移除 step。
- **Run** 会通过 headless
  [`MissionRunner`](../../web/src/components/MissionRunner.jsx) component
  执行 mission，每次运行一个 step。它挂载在 `AppLayout` 中，与 Scheduler 一样需要保持浏览器标签页打开。每个 step 完成后会显示 ✓/✗。
- mission 本身也可以作为 Scheduler target：在此页面创建后，即可在[Scheduler 页面](#scheduler--schedulerpagejsx)设置定时运行。

## Status — `InfoPage.jsx`

用于查看诊断信息的页面（侧边栏称为 “Status”，对应文件为 `InfoPage.jsx`），提供 camera、battery、充电和系统健康信息，不包含可能误触的驾驶控件。


- Battery 显示实时电量百分比，以及最近 40 次读数的滚动 **trend** sparkline，可快速发现电量消耗是否异常加快，而不只看当前数值。
- 充电站状态通过 `/charge_station_connected` 判断是否已连接。
- 此处完整显示的 `SystemHealth` panel 与 Config 中的紧凑版相同；具体检查项见[课程 07](07-ui-components.md#systemhealth--systemhealthjsx)。
- 没有 battery data 表示没有节点发布 `/battery_status`（标准 launch 默认不会启动 `battery.py`）。页面仍可正常使用，只会显示 “No battery telemetry.”。

## Devices — `DevicesPage.jsx`

用于手动登记外部硬件的页面，可记录 USB、CAN、network 或连接到 Raspberry Pi 的设备；如果有可用的 ROS topic，还会显示实时状态标记。


- **Detected serial ports** 列出当前插在运行 Flask backend 的机器上的真实 USB-serial devices。点击某项可预填登记表单。它只能发现此 host 上的 serial ports，无法发现 CAN interfaces、network devices 或另一台 Pi 上的硬件。
- 登记设备时只需提供名称和 connection target（serial path、CAN interface 或 host:port）。status topic 为可选项：只需记录设备时可留空；也可以填写该设备 driver 发布的 topic，以显示实时 online/offline badge。
- 除 serial ports 外，页面不会自动 plug-and-play 检测设备；需要手动登记已连接的硬件。

## Health — `HealthPage.jsx`

“Health Centre” 汇总分散在多个页面中的信号，帮助判断“整台机器人是否已就绪”。


- 顶部 banner 汇总为一种状态：Ready、Ready with warnings、Needs attention 或 Not ready；不是单纯 “Ready” 时会显示简短原因。
- 下方显示 `SystemHealth`（topics/TF）、`LifecycleStatus`（Nav2 lifecycle nodes）、Devices summary（并链接到[Devices](#devices--devicespagejsx)以处理离线设备）、Battery、原始 `/diagnostics` messages，以及所有预期 topics 是否都存在。
- 当前 session 的 **Recent faults** log 会记录状态由正常转为异常的时间，例如 TF chain 断开、lifecycle node 未知或 topic 停止发布。记录按 severity 着色，便于区分“曾出错后已恢复”和“仍然故障”。


- **Export support package** 会将上述信息（connection info、health 汇总、近期事件、metrics snapshot、runtime config 和尽可能获取的 Nav2 parameter snapshot）打包到一个文件，方便远程协助调试。

## Metrics — `MetricsPage.jsx`

查看机器人的运行记录：行驶距离、运行时间，以及 goal 和 docking 的成功次数。数据由客户端根据系统已经发布的 telemetry 计算，无需额外 instrumentation。


- Counters（距离、goal/dock 结果、最高速度）会跨页面刷新保留，存放在浏览器中。**Reset counters** 会将它们清零；由于操作不可撤销，会先要求确认。
- 距离和速度由机器人的 odometry 积分得出；goal/dock 结果来自[课程 07](07-ui-components.md)介绍的 navigation-status 和 docking-status topics。

## Recordings — `RecordingsPage.jsx`

录制真实的 `ros2 bag` sessions，之后可以回放，适用于 debugging、demo 和 dataset 收集。


- Record **all topics** or hand-pick from a checklist (scan, odometry, map,
  AMCL pose, nav status, battery, joint states, TF). Give it a name and an
  optional description.
- Saved recordings can be **Replayed** (at an adjustable rate, with
  pause/resume), **Downloaded**, or **Deleted**. Stopping a replay takes a
  few seconds in the real world — `ros2 bag play` needs that long to shut
  down cleanly after a stop request — and the button says so while it
  waits, rather than looking stuck.
- Replayed telemetry is always clearly labeled as a replay, never presented
  as if it were a live robot.

## Events — `EventsPage.jsx`

持久保存可供查看的事件时间线，记录 navigation 结果、docking、低电量和 emergency stop 等，方便事后回顾。


- Recorded automatically by
  [`EventRecorder`](../../web/src/components/EventRecorder.jsx) (mounted in
  `AppLayout`, so it's always watching, not just while this page is open)
  into the browser's local storage — it survives reloads.
- Filter by type (navigation, docking, battery, safety, system) and severity
  (info, success, warning, error). **Export** downloads the full log as
  JSON; **Clear** wipes it.

## Console — `ConsolePage.jsx`

实时 `/rosout` log console，并提供 “echo any topic” 面板。可以直接在浏览器中调试运行中的系统，无需另开已 source ROS 环境的 terminal。


- `ROSOUT` streams ROS log messages with a level filter, node filter, and
  text search, and a `FOLLOW`/`Pause` toggle for when you want to freeze the
  view to read something.
- `TOPIC ECHO` subscribes to any topic name you type and shows raw messages
  as they arrive — the browser equivalent of `ros2 topic echo`, covered
  alongside the rest of the CLI toolkit in
  [Lesson 12](12-debugging-with-ros-cli.md).

## Parameters — `ParamsPage.jsx`

无需使用 terminal，即可实时调整 Nav2 parameters。


- Each row is one parameter on one node — add a row, type the node name
  (e.g. `/controller_server`) and parameter name (e.g.
  `FollowPath.max_vel_x`), pick its type, then **Read** its current value or
  **Set** a new one.
- This calls the same standard `rcl_interfaces` `get_parameters`/
  `set_parameters` services any ROS 2 node exposes ([Lesson 02](02-ros2-core-concepts.md#service))
  — nothing OpenAMR-specific, just a browser front end for it.
- Changes are **runtime-only**: they revert the moment the target node
  restarts, exactly like running `ros2 param set` by hand would.

## Config — `ConfigPage.jsx`

配置此浏览器的 connection 和 safety defaults。这些设置保存在本地，不会与其他操作员共享，也不会写入机器人。


- **Connection** — the "Robot address override"/"Robot connection port"
  fields (backed by rosbridge host/port under the hood) and the camera
  stream port. Leave the address blank to auto-use whichever address the
  page itself was loaded from (the normal case once this is deployed on the
  robot). A **Connection diagnostics** card right below mirrors the Health
  Centre rollup, so a bad setting shows its effect right where you'd go to
  fix it — including its "Ready with warnings" state, not just the nominal
  one.


- **Manual-drive safety limits** — ceiling values for the joystick and the
  Map page's max-speed slider; lowering either takes effect immediately for
  new drive commands.


- **Notifications** — browser notifications for nav completion, docking, and
  low battery (needs the browser's notification permission granted, shown
  here already granted), plus the percentage threshold that counts as "low."


- **Keep-out zones** — rectangular no-go areas drawn in map coordinates;
  visible on the Map page's `Zones` layer, but this is a visual aid only —
  real enforcement needs a Nav2 `keepout_filter` configured on the robot
  side.


## The pattern across every page

上面多数页面使用相同模式：读取共享 ROS connection（见[课程 10](10-topics-as-the-contract.md)），创建绑定到共享 constants file 中名称的 `ROSLIB.Topic`/`Service` instances，进行 subscribe 或 publish，并在卸载时清理。页面不会自行创建 connection，而是共用[课程 03](03-how-the-browser-talks-to-ros.md)介绍的连接。新增页面或 panel 时请遵循[`docs/extending/add-a-ui-panel.md`](../extending/add-a-ui-panel.md)中的模式。

Scheduler/Missions 通过各自的 runner components（`SchedulerRunner`/`MissionRunner`）使用共享 connection。它们挂载在 `AppLayout` 中，因此离开创建 schedule/mission 的页面后仍会运行。全应用共用一个 connection，页面和 runner 均不自行创建连接。

## 试一试

根据任务表依次打开 Map、Health、Config 和一个自动化页面。分别确认各页面的数据来自 ROS、backend REST API，还是浏览器本地存储。

**完成标准：**能为单个 goal、可复用 route、map 变更、健康警告和自动 mission 选择合适页面，并判断其中哪些操作会使真实硬件移动。

## 下一课

[课程 07——UI 组件详解](07-ui-components.md)会深入介绍 Map 和 Route 背后的各个面板：它们显示什么、具体使用哪些 topics/services，以及内部 state 如何工作。

---

[← 课程 05](05-backend-nodes-in-detail.md) · [课程索引](README.md) · [下一课：课程 07 →](07-ui-components.md)
