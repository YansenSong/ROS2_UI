# Codex 交接文档：基于 OpenAMRobot UI 改造巡检机器人远端控制 Demo

> **用途**：把本文件放到本地 `openamrobot-ui` 仓库根目录，作为 Codex 的主执行说明。  
> **执行对象**：Codex / coding agent。  
> **项目基底**：`openAMRobot/openamrobot-ui`。  
> **GitHub 调研基线**：`main`，调研时 HEAD 为 `aef93d5071291f82718493ce3ac56ca2372ca93d`。  
> **重要**：本地仓库的实际 HEAD 才是执行基线。开始修改前必须运行 `git rev-parse HEAD` 并记录；如果与上述 SHA 不同，以本地代码为准并重新核对相关文件。  
> **任务性质**：在现有项目上做项目化裁剪、ROS2 接口适配、任务执行架构调整和 Demo 功能完善。不是重写前端，不是重新实现 SLAM/定位/规划/控制算法。

---

## 0. 给 Codex 的一句话任务

把当前 OpenAMRobot UI 改造成一个**单移动机器人巡检远端控制 Demo**：

- 能显示二维地图和机器人实时位置；
- 能创建、保存、编辑“巡检点”；
- 能按用户指定顺序组成巡检任务；
- 能启动、暂停、恢复、取消巡检任务；
- 能显示当前任务、当前巡检点、总进度、成功/失败状态；
- 能发送单点导航目标；
- 能显示定位、导航、电池、连接、故障等基本状态；
- 保留有限的远程人工控制能力，但**不得绕过机器人本地安全链路**；
- UI 中的红色停止按钮只能定义为**软件停车 / Software Stop**，不得声称为硬件急停或 safety-rated E-STOP；
- 网络断开后，已经下发并被机器人接受的巡检任务应由机器人端继续执行或按机器人端策略安全停止，不能依赖浏览器标签页持续打开；
- 不开发火焰、烟雾、积水、安全帽、人脸等业务感知；
- 不修改 LIO-SAM、NDT、Hybrid A*、NeuPAN 的算法实现，只做 UI/任务层与这些模块的 ROS2 接口适配。

最终应交付**可运行代码 + 自动化测试 + Demo Mode 演示 + 接口说明 + 未完成/待确认项清单**。

---

# 1. 必读规则

开始任何修改前：

1. 阅读仓库根目录：
   - `AGENTS.md`
   - `CONTRIBUTING.md`
   - `README.md`
2. 阅读：
   - `docs/development.md`
   - `docs/lessons/03-how-the-browser-talks-to-ros.md`
   - `docs/lessons/04-data-flow-and-relays.md`
   - `docs/lessons/10-topics-as-the-contract.md`
3. 记录：
   ```bash
   git rev-parse HEAD
   git status --short
   git branch --show-current
   ```
4. 检查是否已有本地未提交修改，不得覆盖用户已有工作。
5. 不得修改或弱化仓库已有安全规则。
6. 不得把物理急停、制动、底盘 interlock、watchdog 等“安全实现”塞进 UI。
7. 不得把浏览器页面的状态显示当成物理安全验证。
8. 不得直接宣称“急停功能已完成”，除非仅明确指 **Software Stop**，并清楚说明硬件 E-STOP 不属于本任务。
9. 不得为了适配本项目去重写整个 OpenAMRobot UI。
10. 优先复用现有 React、rosbridge、Flask、relay、Demo Mode 和测试体系。

---

# 2. 本项目需求来源与边界

以下是本项目必须尊重的技术边界。

## 2.1 总体软件架构

项目采用 ROS2 分层架构：

```text
感知
  ↓
建图
  ↓
定位
  ↓
规划
  ↓
避障控制
  ↓
业务识别
  ↓
任务执行
  ↓
远端管理
```

本次 Codex 工作主要覆盖：

```text
任务执行
+
远端管理
+
与导航/定位/状态模块的接口适配
```

不覆盖业务感知模型开发。

---

## 2.2 导航技术路线

项目已确定：

```text
LIO-SAM 三维建图
        ↓
NDT 地图定位
        ↓
Hybrid A* 全局规划
        ↓
NeuPAN 局部规划与控制
        ↓
底盘
```

**不要把 UI 绑定在 Nav2 算法实现上。**

OpenAMRobot UI 原项目大量采用 Nav2 命名和状态接口。改造后应形成“UI/任务层与导航实现解耦”的接口层。

---

## 2.3 端侧自主和网络解耦

必须遵守：

```text
定位
避障
急停
底盘控制
低电回充
```

均属于机器人本地闭环能力。

远端网络掉线时：

- 已经开始的任务不能因为浏览器关闭就必然消失；
- 任务由机器人本地执行器继续执行或按机器人端安全策略停止；
- 关键状态和日志应能在恢复连接后继续查看；
- 远端控制不得绕过机器人本地安全策略。

---

## 2.4 巡检任务语义

巡检任务核心流程：

```text
移动到巡检点
   ↓
执行巡检动作
   ↓
获取并上报结果
   ↓
前往下一点
```

本次不实现业务识别，因此把“执行巡检动作”设计为可扩展 hook：

```text
到点
↓
确认停车/定位
↓
执行 NOOP / WAIT / future inspection hook
↓
下一点
```

至少支持：

- 开始
- 暂停
- 恢复
- 取消
- 状态反馈
- 失败状态
- 可配置重试（若机器人侧执行器已经有能力）
- 任务 ID
- 当前点序号
- 总点数
- 失败原因

---

# 3. 已确认的 OpenAMRobot UI 现状

以下分析基于上述 GitHub baseline。修改前必须在本地再次确认。

## 3.1 浏览器与 ROS2 的通信方式

现有结构：

```text
React
  ↓
roslibjs
  ↓
WebSocket
  ↓
rosbridge_server
  ↓
ROS2 graph
```

全局 ROS 连接位于：

```text
web/src/app/App.jsx
```

整个前端共享一个 `ROSLIB.Ros()`。

**不要为新页面各自创建新的 rosbridge 连接。**

---

## 3.2 ROS 接口集中定义

当前主要接口常量在：

```text
web/src/shared/constants/index.js
```

当前包括：

```text
/cmd_vel
/odom
/ui/map
/ui/amcl_pose
/ui/navigate_to_pose/status
/navigate_to_pose/_action/feedback
/navigate_to_pose/_action/cancel_goal
/goal_pose
/initialpose
/battery_status
...
```

本项目改造后仍应保持：

> ROS topic / service / action 名称集中管理，禁止在各 React 组件里到处写死。

---

## 3.3 地图

核心：

```text
web/src/components/Map.jsx
```

目前地图订阅：

```text
/ui/map
```

消息类型：

```text
nav_msgs/OccupancyGrid
```

这是本项目可以继续复用的部分。

项目虽以 LIO-SAM 建三维地图，但技术文档明确还会生成导航所需的二维占据地图，因此 Web UI 继续显示 `OccupancyGrid` 是合适的。

---

## 3.4 当前机器人位置

现有：

```text
web/src/components/RobotState.jsx
```

当前逻辑：

- 优先使用 `/ui/amcl_pose`
- fallback 到 `/odom`
- UI 文案明确写了 AMCL / Map-corrected

本项目定位算法是 NDT，因此需要把 AMCL 语义去掉。

最终应表达为：

```text
Localization: NORMAL / DEGRADED / LOST / UNKNOWN
Pose source: configured localization pose topic
X
Y
Yaw
Linear velocity
Angular velocity
```

如果本项目目前只提供一个 NDT pose topic，没有独立质量状态，则：

- 可以先显示 `LOCALIZED` / `STALE` / `UNKNOWN`
- 不得凭 UI 自己猜“定位正常”
- 必须保留 freshness/stale 语义

---

## 3.5 单点导航

当前 `MapPage.jsx` 直接向：

```text
/goal_pose
```

发布：

```text
geometry_msgs/PoseStamped
```

并订阅 Nav2 action status。

这不能默认认为与本项目 Hybrid A* + NeuPAN 的接口兼容。

需要创建适配层。

---

## 3.6 Waypoint Queue

当前：

```text
web/src/pages/MapPage.jsx
```

包含浏览器侧：

```text
waypointQueue
queueExecuting
queueIdxRef
```

浏览器观察 `/ui/navigate_to_pose/status`，一个点成功后发送下一个点。

**这不能作为本项目正式巡检任务执行机制。**

原因：

- 浏览器关闭，执行器就没了；
- 网络掉线无法保证继续；
- “取最新 GoalStatus”容易和其他导航 goal 混淆；
- 不满足“端侧自主、平台管理、网络解耦”。

改造后：

- MapPage 的临时 waypoint queue 可以保留为 Demo/调试工具；
- 正式“巡检任务”必须由机器人侧 mission executor 执行；
- Live Mode 不得把浏览器 MissionRunner 当机器人端任务执行器。

---

## 3.7 Saved Waypoints

当前：

```text
web/src/shared/hooks/useSavedWaypoints.js
```

使用：

```text
localStorage
```

key：

```text
openamrSavedWaypoints
```

组件：

```text
web/src/components/WaypointLibrary.jsx
```

本项目应把 UI 文案中的：

```text
Saved Waypoints
```

改成：

```text
Inspection Points / 巡检点
```

建议将持久化从纯 `localStorage` 提升到现有 Flask 后端文件存储；如果本阶段时间有限，至少建立 persistence adapter，使 UI 不直接依赖 localStorage。

---

## 3.8 Missions

当前定义：

```text
web/src/shared/missions/missions.js
```

当前 step 类型：

```text
waypoint
home
wait
dock
undock
```

定义存在浏览器 `localStorage`。

页面：

```text
web/src/pages/MissionsPage.jsx
```

实际执行器：

```text
web/src/components/MissionRunner.jsx
```

**当前 MissionRunner 是浏览器端执行器。**

源码中已经明确说明：

> mission 只在浏览器 tab 保持打开时运行，不是 robot-side autonomy。

因此，这是本项目必须重点改掉的部分。

---

## 3.9 当前 STOP

`MapPage.jsx` 当前 `emergencyStop()`：

1. 发布一次零 `geometry_msgs/Twist`
2. cancel 导航
3. UI 记录 `"Emergency stop"`

这不是安全急停。

本项目改造必须：

```text
Emergency Stop / E-STOP
```

改名为：

```text
Software Stop
软件停车
```

并明确：

```text
This is not the physical E-STOP.
```

如果本项目存在本地安全管理节点提供的 software stop service/action，调用该接口。

如果没有：

- 不得自己伪造 safety-rated E-stop；
- Live Mode 可以退化为“取消任务 + 取消导航 + 请求速度归零”的 best-effort 软件停车；
- 页面明确标注“非硬件急停”；
- 记录未验证项。

---

## 3.10 Joystick

当前：

```text
web/src/components/Joystick.jsx
```

直接向：

```text
/cmd_vel
```

以 100ms 周期发布。

这对本项目存在潜在架构问题：

> 远端控制不得绕过本地安全策略。

因此执行以下规则：

- 如果本项目已经有“受安全链路管理的 manual command topic/service”，改接那个；
- 如果本地底盘安全层明确允许 `/cmd_vel` 作为受监管输入，保留；
- 如果无法确认，**不要默认把公网/远端 UI 直连 raw `/cmd_vel`**；
- 未确认时 Live Mode 禁用 joystick，Demo Mode 可继续模拟；
- UI 显示“Manual control interface not configured”而不是假装可用。

---

## 3.11 ROS2 relays

现有：

```text
ros2/src/openamr_ui_package/openamr_ui_package/map_relay.py
ros2/src/openamr_ui_package/openamr_ui_package/nav_relays.py
```

已有模式：

```text
robot topic
   ↓
QoS relay
   ↓
/ui/*
   ↓
rosbridge/browser
```

继续复用这个模式。

但不要继续把源 topic 写死为：

```text
/amcl_pose
/navigate_to_pose/_action/status
```

优先将 relay source/destination 变成 ROS2 parameters。

---

## 3.12 RoutePage / waypoint_nav.py

现有：

```text
web/src/pages/RoutePage.jsx
ros2/src/openamr_ui_package/openamr_ui_package/waypoint_nav.py
```

`waypoint_nav.py` 使用：

```text
nav2_simple_commander.BasicNavigator
```

本项目不能把这个文件直接当核心任务执行器，除非实际机器人导航接口就是兼容 Nav2。

可复用：

- Route 编辑交互
- Route 文件管理思路
- 任务顺序 UI

不可默认复用：

- `BasicNavigator`
- Nav2-specific action/service
- AMCL-specific localization

---

# 4. 本次最终目标 UI

优先做成一个“工程 Demo 控制台”，而不是保留所有 OpenAMRobot 功能。

建议最终侧边栏保留：

```text
Map / 地图
Inspection / 巡检任务
Routes / 巡检路线
Maps / 地图管理
Status / 机器人状态
Health / 系统健康
Events / 事件日志
Config / 配置
```

以下页面默认从主导航隐藏，但不要急着删除源代码：

```text
Programs
Scheduler
Robot
Devices
Metrics
Recordings
Console
Parameters
Fleet
Notes/plugin demo
```

原因：

- 减少 Demo 噪声；
- 降低误操作；
- 保留后续恢复能力；
- 避免大规模 destructive refactor。

修改：

```text
web/src/pages/registry.js
```

采用 feature flag 或 `visible` 属性优于删除组件。

---

# 5. 目标架构

改造目标：

```text
┌──────────────────────────────────────────┐
│               React Web UI               │
│                                          │
│ Map / Inspection / State / Health        │
└──────────────────┬───────────────────────┘
                   │
             rosbridge / REST
                   │
┌──────────────────▼───────────────────────┐
│            UI Integration Layer          │
│                                          │
│ topic relays                             │
│ persistence adapter                      │
│ project ROS contract/config              │
└───────────────┬──────────────────────────┘
                │ ROS2
┌───────────────▼──────────────────────────┐
│        Robot-side Mission Manager        │
│                                          │
│ mission state machine                    │
│ point sequence                           │
│ pause/resume/cancel                      │
│ retry/status/logging                     │
└───────────────┬──────────────────────────┘
                │
┌───────────────▼──────────────────────────┐
│           Navigation Adapter             │
│                                          │
│ UI 不知道 Hybrid A* / NeuPAN 的细节       │
└───────────────┬──────────────────────────┘
                │
      ┌─────────┴─────────┐
      ▼                   ▼
 Hybrid A*             NeuPAN
      │                   │
      └─────────┬─────────┘
                ▼
              chassis

Localization:
LIO-SAM map + NDT pose/status
       │
       └────────────→ relays → UI
```

---

# 6. 关键设计原则

## 6.1 UI 不知道具体算法

React 不应该出现：

```text
HybridAStarClient
NeuPANController
NDTSpecificSomething
```

UI 只关心：

```text
get robot state
send navigation target
start mission
pause mission
resume mission
cancel mission
software stop
```

算法替换不应导致 UI 大改。

---

## 6.2 任务执行必须机器人侧

正式巡检任务不能依赖：

```text
setTimeout
browser Promise loop
React component lifecycle
browser tab
```

浏览器只负责：

```text
创建任务
下发任务
展示反馈
发暂停/恢复/取消命令
```

机器人侧负责：

```text
P1
↓
P2
↓
P3
↓
...
```

---

## 6.3 浏览器重连不改变任务事实

如果：

```text
浏览器断开 20 秒
```

机器人仍在执行任务，则重连后 UI 应恢复显示：

```text
Mission: RUNNING
Current: 3 / 7
Current point: 配电柜东侧
```

UI 不得因为自己刚打开而把机器人任务显示成“未运行”。

---

## 6.4 UNKNOWN / STALE 必须真实

例如定位 pose topic 2 秒没更新：

不要继续绿灯显示“定位正常”。

显示：

```text
STALE
UNKNOWN
LOST
```

取决于机器人实际接口。

---

# 7. 必须先侦察本地机器人接口

项目文档只确定算法路线，没有给出最终 ROS2 topic/action/service 名称。

**禁止 Codex 猜接口。**

在本地工作区搜索：

```bash
rg -n "ActionServer|ActionClient|create_publisher|create_subscription|create_service|create_client" .
rg -n "goal_pose|navigate|mission|pause|resume|cancel|cmd_vel|odom|ndt|localization|battery|diagnostic" .
find . -type f \( -name "*.msg" -o -name "*.srv" -o -name "*.action" \) -print
```

如果 ROS2 环境可运行，再检查：

```bash
ros2 topic list
ros2 service list
ros2 action list
ros2 node list
ros2 topic info -v /map
ros2 topic info -v /odom
```

然后建立：

```text
docs/project/robot_interface_inventory.md
```

内容至少包括：

| 能力 | 实际接口 | 消息/Action 类型 | QoS | 状态 |
|---|---|---|---|---|
| 2D map | ? | nav_msgs/OccupancyGrid | ? | FOUND/TODO |
| robot pose | ? | ? | ? | FOUND/TODO |
| localization state | ? | ? | ? | FOUND/TODO |
| nav goal | ? | ? | - | FOUND/TODO |
| nav feedback | ? | ? | ? | FOUND/TODO |
| nav cancel | ? | ? | - | FOUND/TODO |
| software stop | ? | ? | - | FOUND/TODO |
| manual control | ? | ? | ? | FOUND/TODO |
| battery/BMS | ? | ? | ? | FOUND/TODO |
| diagnostics | ? | ? | ? | FOUND/TODO |

如果找不到接口：

- 不得发明一个“已集成完成”的接口；
- 继续完成 UI、adapter、Demo Mode、tests；
- 将硬件接入标记为 `BLOCKED: robot interface not supplied`。

---

# 8. ROS 接口配置层

## 8.1 不要继续让 AppConfig 写死项目接口

在：

```text
web/src/shared/constants/index.js
```

保持默认值兼容 upstream Demo。

新增一个项目配置层，例如：

```text
web/src/shared/robot/robotContract.js
```

或与现有 runtime config 体系整合。

目标形式示例：

```js
{
  mapTopic: "/ui/map",
  localizationPoseTopic: "/ui/localization_pose",
  localizationStateTopic: "/ui/localization_state",
  odomTopic: "/odom",

  navigation: {
    goalTopic: "...",
    statusTopic: "...",
    feedbackTopic: "...",
    cancelService: "..."
  },

  mission: {
    command: "...",
    stateTopic: "..."
  },

  softwareStopService: "...",
  manualCommandTopic: "...",

  batteryTopic: "...",
  diagnosticsTopic: "/diagnostics"
}
```

实际名称由本地接口 inventory 决定。

---

## 8.2 ROS relay 参数化

修改：

```text
map_relay.py
nav_relays.py
```

使：

```text
source_topic
destination_topic
```

可通过 ROS2 parameter 配置。

保留 `/ui/*` 作为 browser-facing topic 的概念。

例如：

```text
project localization pose
      ↓
localization relay
      ↓
/ui/localization_pose
```

不要让前端直接知道 NDT 节点内部命名。

---

# 9. 巡检点数据模型

统一“巡检点”，不要在各处出现多个不兼容结构。

建议前端 canonical model：

```json
{
  "id": "point-001",
  "name": "1号配电柜",
  "mapId": "warehouse-1",
  "pose": {
    "x": 12.3,
    "y": 4.8,
    "yaw": 1.57
  },
  "dwellSec": 3,
  "enabled": true,
  "action": {
    "type": "none"
  }
}
```

本阶段 action 支持：

```text
none
wait
```

为未来保留：

```text
inspect
camera
sensor
```

但不要实现业务识别。

---

# 10. 巡检任务数据模型

建议：

```json
{
  "id": "mission-20261001-001",
  "name": "仓库日常巡检",
  "mapId": "warehouse-1",
  "points": [
    {
      "pointId": "point-A",
      "retry": 1
    },
    {
      "pointId": "point-C",
      "retry": 1
    },
    {
      "pointId": "point-B",
      "retry": 0
    }
  ]
}
```

用户必须能：

- 添加点；
- 删除点；
- 上移/下移；
- 明确顺序编号；
- 保存任务；
- 启动任务；
- 查看任务执行状态。

---

# 11. Mission 状态机

机器人侧任务状态至少定义：

```text
IDLE
ACCEPTED
RUNNING
PAUSED
CANCELING
CANCELED
SUCCEEDED
FAILED
UNKNOWN
```

每个巡检点状态：

```text
PENDING
NAVIGATING
ARRIVED
DWELLING
SUCCEEDED
FAILED
SKIPPED
```

UI 不要把：

```text
导航 Action Succeeded
```

自动等同于：

```text
整个巡检任务 Succeeded
```

---

# 12. Mission Manager 实现要求

## 12.1 优先复用现有机器人任务接口

如果本地项目已经存在 task/mission executor：

**不要再实现第二套。**

编写 adapter 把 UI 连接到现有接口。

---

## 12.2 如果当前没有 robot-side mission executor

可在现有 ROS2 工程内增加一个轻量 mission manager，但必须遵守：

- 不实现物理安全逻辑；
- 不直接控制电机；
- 只调用已有 navigation interface；
- pause/cancel 应通过 navigation/task interface；
- 不绕过 Safety Manager；
- 不修改 Hybrid A*/NeuPAN 内部算法；
- 任务 goal 接收后完整保存到机器人进程内存，使浏览器掉线后仍可继续；
- 周期发布 mission state，使 UI 重连后恢复状态；
- 对关键 transition 写日志。

如果新增跨模块 ROS contract 会违反本仓库 `AGENTS.md` 中的 shared-contract 规则：

1. 先搜索 `openamrobot-interfaces` 或本地接口仓库是否已有适合接口；
2. 没有则在：
   ```text
   docs/project/PROPOSED_inspection_mission_contract.md
   ```
   中写清 Proposed contract；
3. 不要谎称 proposal 已获 owner acceptance；
4. 在没有正式接口批准时，可以完成 fixture/Demo adapter，但实际硬件 hookup 标记 `BLOCKED`。

---

# 13. 浏览器 MissionRunner 的处理

当前：

```text
web/src/components/MissionRunner.jsx
```

不得继续作为 Live Mode 正式执行器。

改造方向：

### Demo Mode

可以继续复用/改造浏览器 MissionRunner 来模拟：

```text
任务状态
点位顺序
成功/失败
```

便于无机器人演示。

### Live Mode

必须：

```text
Run
↓
发送完整 mission 给 robot-side executor
↓
订阅 robot-side mission state
```

而不是：

```text
React for-loop
↓
发 P1
等 status
↓
发 P2
```

建议新建：

```text
web/src/features/inspection/
```

例如：

```text
InspectionPage.jsx
InspectionMissionEditor.jsx
InspectionMissionStatus.jsx
InspectionPointPanel.jsx
inspectionApi.js
missionTransport.js
```

避免继续把所有逻辑堆进 `MissionsPage.jsx`。

---

# 14. 暂停 / 恢复 / 取消

UI 必须有三个不同语义：

## Pause

```text
暂停当前巡检任务
```

机器人保持任务上下文。

## Resume

```text
从当前任务上下文恢复
```

## Cancel

```text
取消整个巡检任务
```

任务进入：

```text
CANCELING → CANCELED
```

不要用“发一个新的 goal”模拟 resume。

---

# 15. Software Stop

## 15.1 UI 文案

把当前：

```text
E-STOP
Emergency stop
```

全部改成：

```text
Software Stop
软件停车
```

tooltip：

```text
Stops/cancels software-controlled motion.
This is NOT the physical emergency stop.
```

---

## 15.2 行为

优先：

```text
UI
↓
local safety / software-stop service
↓
robot local safety chain
```

如果项目接口尚未提供，只允许 best-effort fallback：

```text
cancel mission
cancel active navigation
request zero motion
```

但必须明确：

```text
NOT safety-rated
NOT physical E-STOP
```

---

## 15.3 不要做

禁止：

- 声称 Web 按钮是硬件急停；
- 把 rosbridge 当 safety channel；
- 在 UI 里实现 watchdog；
- 修改底盘制动逻辑；
- 在前端绕过 Safety Manager。

---

# 16. 机器人位置与定位状态

修改：

```text
RobotState.jsx
LocalizationStatus.jsx
```

移除 AMCL 特定文案。

UI 显示：

```text
Localization
  NORMAL / DEGRADED / LOST / STALE / UNKNOWN

Pose
  X
  Y
  Yaw

Velocity
  linear
  angular
```

项目需求中定位丢失或明显跳变应由**机器人本地**停车并重定位。

UI 只负责显示状态，不实现这一安全逻辑。

---

# 17. Map 页面目标布局

最终 Map 页建议：

```text
┌───────────────────────────────────────────────────────────────┐
│ Robot-01   ROS: Online   Localization: NORMAL   Battery: 82% │
├───────────────────────────────────────────────┬───────────────┤
│                                               │ Current Task  │
│                                               │               │
│                    MAP                        │ Daily Patrol   │
│                                               │               │
│           ① ───── ②                           │ 1. Door ✓     │
│                   │                           │ 2. Cabinet ●  │
│                   ③ ─── ④                     │ 3. Fire Zone  │
│                                               │               │
│                  ▲ Robot                      │ Progress 2/4  │
│                                               │               │
├───────────────────────────────────────────────┴───────────────┤
│ Send Goal | Save Inspection Point | Manual | Software Stop   │
└───────────────────────────────────────────────────────────────┘
```

Camera 可以保留但降为次要模块。

业务识别结果本阶段不做。

---

# 18. 巡检点功能

从当前：

```text
WaypointLibrary
```

演进为：

```text
InspectionPointLibrary
```

支持：

- 从当前机器人位置保存；
- 地图右键保存；
- 重命名；
- 删除；
- 一键导航；
- 显示 x/y/yaw；
- 可配置 dwell time；
- 以后可扩展 inspection action。

不要把“临时 waypoint queue”和“持久化巡检点”混为一个概念。

---

# 19. 数据持久化

当前：

```text
waypoints → localStorage
missions → localStorage
```

对于项目 Demo，推荐迁移成：

```text
React
  ↓ REST
existing Flask backend
  ↓
~/.openamr_ui/
```

例如：

```text
~/.openamr_ui/project/
  inspection_points.json
  inspection_missions.json
```

要求：

- 不增加数据库；
- 原子写入；
- JSON schema 做最基本校验；
- 加载失败时不能 silently 清空原文件；
- REST 错误反馈给 UI；
- Demo Mode 可有 fixture；
- localStorage 旧数据可做一次性 migration，或明确说明不迁移。

如果时间不足，至少写 persistence adapter：

```text
InspectionRepository
```

让 UI 不再直接到处调用 `localStorage`。

---

# 20. 网络掉线行为

必须测试：

```text
Robot mission RUNNING
↓
关闭浏览器 / 中断 rosbridge
↓
等待
↓
重新打开
↓
UI 恢复显示 robot-side current mission
```

如果无法在 CI 做真实 rosbridge 网络测试：

- 为 transport/state adapter 写单元测试；
- Demo fixture 模拟 disconnect/reconnect；
- 实机项标记 Not verified。

---

# 21. 日志与事件

复用：

```text
web/src/shared/events/eventLog.js
EventsPage
```

至少记录：

```text
mission created
mission started
mission paused
mission resumed
mission canceled
mission succeeded
mission failed
navigation target sent
software stop requested
connection lost
connection restored
localization stale/lost
```

注意：

浏览器本地 event log 不等于机器人正式运行日志。

如果机器人已经有日志/故障 topic，UI 应展示 robot-side event；不要以浏览器 log 代替。

---

# 22. Status / Health 页面

保留：

```text
/info
/health
/events
```

但 Nav2-specific health 项需要裁剪。

当前：

```text
LIFECYCLE_NODES
map_server
amcl
controller_server
planner_server
bt_navigator
```

本项目不是标准 Nav2。

要求：

- 不显示不存在的 Nav2 node 为“故障”；
- 改为项目实际 node inventory；
- 或在 project mode 隐藏 Nav2 lifecycle section；
- Health 页面至少显示：
  - ROS connection
  - map freshness
  - localization freshness/state
  - mission manager freshness
  - battery freshness
  - diagnostics freshness

---

# 23. Maps / Routes

## Maps

二维导航地图仍可复用。

项目文档要求地图统一管理：

```text
禁行区
限速区
充电区
巡检点
```

本次 Demo 至少支持：

```text
地图显示
巡检点
已有 keepout zone 显示（若兼容）
```

无需实现完整地图业务资产系统。

## Routes

RoutePage 可以保留，但：

- 与“巡检任务”概念区分；
- route = 可复用几何路径/点序列；
- mission = 有顺序、有状态、有生命周期的巡检任务。

如果现有 RoutePage 强依赖 Nav2 ComputePathToPose，project mode 下需：

- 使用项目 global planner 的 accepted planning interface；
- 或禁用 `Auto-plan` 按钮并显示 “Planner interface not configured”；
- 不得调用不存在的 Nav2 service 然后假装是项目规划器。

---

# 24. 页面裁剪的实现方式

修改：

```text
web/src/pages/registry.js
```

建议从：

```js
{ path, label, icon, component }
```

扩展：

```js
{
  path,
  label,
  icon,
  component,
  visibleInProjectMode: true
}
```

或根据 runtime config：

```text
uiProfile = upstream | inspection_demo
```

做到：

- 上游功能代码仍存在；
- Demo 主界面干净；
- 不做无意义大删除。

---

# 25. 项目模式

建议新增：

```text
UI_PROFILE=inspection_demo
```

或 runtime config：

```json
{
  "uiProfile": "inspection_demo"
}
```

inspection_demo 模式下：

- 主导航裁剪；
- 文案改成 Inspection；
- 禁用未配置的 Nav2-only 能力；
- Software Stop 正确标注；
- 使用 project robot contract。

Demo Mode 仍保留，二者不是同一个概念：

```text
uiProfile = 产品/项目界面布局
demoMode = 是否使用模拟数据
```

不要混在一起。

---

# 26. 中文界面

不是核心阻塞项。

当前项目已有轻量 i18n：

```text
web/src/shared/i18n/i18n.js
```

当前只有：

```text
en
de
```

如果时间允许，加：

```text
zh-CN
```

至少覆盖：

```text
Map
Inspection
Routes
Status
Health
Events
Config
Software Stop
Pause
Resume
Cancel
Current Task
Inspection Point
Localization
Battery
Connected
Offline
```

但优先级低于任务执行和 ROS 适配。

---

# 27. 必须修改/重点检查的源码文件

## 前端

### 1

```text
web/src/pages/registry.js
```

任务：

- Project Mode 导航裁剪；
- Missions 重命名/新增 Inspection 页。

### 2

```text
web/src/shared/constants/index.js
```

任务：

- 清理硬编码；
- 增加 project robot contract 的入口；
- 不把 NDT/HybridA*/NeuPAN 算法名散落在 UI。

### 3

```text
web/src/pages/MapPage.jsx
```

任务：

- Software Stop；
- 正式 mission 不在浏览器 queue 执行；
- 巡检点；
- Current Mission summary；
- 未配置手动控制时禁用 joystick；
- 保留单点 Send Goal。

### 4

```text
web/src/components/RobotState.jsx
```

任务：

- 去 AMCL 语义；
- 接项目 localization pose/state；
- freshness。

### 5

```text
web/src/components/LocalizationStatus.jsx
```

任务：

- 去 AMCL-specific service/label；
- 项目定位状态显示。

### 6

```text
web/src/components/NavStatus.jsx
```

任务：

- status source 适配；
- 保持 generic navigation 状态；
- 不能只靠“最新一个 GoalStatus”推断 mission。

### 7

```text
web/src/components/Joystick.jsx
```

任务：

- manual control interface 适配；
- Live Mode 未确认安全输入时禁用。

### 8

```text
web/src/components/WaypointLibrary.jsx
web/src/shared/hooks/useSavedWaypoints.js
```

任务：

- Inspection Point 语义；
- persistence adapter。

### 9

```text
web/src/pages/MissionsPage.jsx
web/src/components/MissionRunner.jsx
web/src/shared/missions/*
```

任务：

- Missions → Inspection Tasks；
- Live Mode 切换 robot-side execution；
- browser MissionRunner 限制在 Demo Mode/fixture。

### 10

```text
web/src/pages/RoutePage.jsx
```

任务：

- 检查 Nav2 planner 耦合；
- project mode 下适配或禁用 Auto-plan。

---

## ROS2 / backend

### 11

```text
ros2/src/openamr_ui_package/openamr_ui_package/map_relay.py
```

任务：

- source topic 参数化；
- QoS 保持可用。

### 12

```text
ros2/src/openamr_ui_package/openamr_ui_package/nav_relays.py
```

任务：

- 不再硬绑 AMCL/Nav2；
- 增加 project localization/nav status relay；
- 参数化。

### 13

```text
ros2/src/openamr_ui_package/openamr_ui_package/waypoint_nav.py
```

任务：

- 不把 `BasicNavigator` 当项目默认执行器；
- 如果保留，标记为 Nav2 compatibility path；
- project mission 执行走 adapter。

### 14

```text
ros2/src/openamr_ui_package/openamr_ui_package/flask_app.py
```

任务：

- inspection points / missions persistence API（若采用 Flask 持久化方案）；
- 复用已有 storage 根目录和响应风格；
- 不新建第二套 Web 后端。

### 15

```text
ros2/src/openamr_ui_package/launch/new_ui_launch.py
```

任务：

- 参数/relay；
- 如存在 project adapter/mission node，加入 launch；
- optional dependency 失败要给清楚提示。

---

# 28. 不应该修改的东西

除非接口适配必须：

```text
LIO-SAM implementation
NDT algorithm
Hybrid A* algorithm
NeuPAN algorithm
底盘控制算法
硬件 E-STOP
brake/interlock
BMS firmware
业务感知
YOLO
segmentation
tracking
face recognition
```

本任务不是算法开发任务。

---

# 29. 开发阶段划分

## Phase 0 — Audit

完成：

- local HEAD
- working tree
- interface inventory
- 当前测试 baseline
- 当前 Demo Mode baseline

输出：

```text
docs/project/current_state.md
```

---

## Phase 1 — UI Project Mode

完成：

- inspection_demo profile；
- sidebar 裁剪；
- Software Stop 正确文案；
- AMCL-specific 文案移除；
- Inspection Point / Inspection Task 命名。

要求：

不改变真实机器人接口行为。

---

## Phase 2 — Persistence

完成：

- inspection points repository；
- mission repository；
- Flask file-backed persistence 或清晰 adapter；
- migration strategy。

---

## Phase 3 — Robot Contract Adapter

完成：

- map source；
- localization pose；
- localization state；
- odom；
- battery；
- diagnostics；
- nav goal；
- nav status；
- nav cancel；
- manual command；
- software stop。

接口缺失必须明确 TODO/BLOCKED。

---

## Phase 4 — Robot-side Mission Execution

完成：

```text
start
pause
resume
cancel
state feedback
progress
```

浏览器掉线不销毁 robot-side mission。

---

## Phase 5 — Demo UX

完成：

- Map 右侧 Current Mission；
- 点位顺序；
- 当前点高亮；
- 任务进度；
- robot pose；
- software stop；
- connection/localization/battery 状态。

---

## Phase 6 — Tests + Docs

完成：

- frontend tests；
- ROS tests；
- Demo Mode manual test；
- build；
- docs；
- Not verified。

---

# 30. Demo Mode 要求

必须保留现有 Demo Mode。

扩展 Demo data，使没有机器人时可演示：

```text
robot pose movement
inspection task
P1 → P2 → P3
pause
resume
cancel
success
failed point
connection stale
localization lost/stale
```

测试不能连接真实运动硬件。

---

# 31. 必须增加的测试

至少包含：

## Frontend

1. Inspection mission point order
2. Add/remove/reorder point
3. Start command emitted exactly once
4. Pause command
5. Resume command
6. Cancel command
7. Robot-side state updates UI progress
8. Reconnect restores state
9. Stale localization displays stale/unknown
10. Live Mode with no manual-control contract disables joystick
11. Software Stop UI explicitly says not physical E-stop
12. Hidden pages not shown in inspection_demo profile
13. Demo Mode仍可用

---

## ROS/backend

若新增 relay/adapter：

1. source → `/ui/*` relay
2. QoS behavior
3. configurable topic parameters
4. no source message → no fake healthy state
5. persistence load/save validation
6. malformed JSON does not destroy good file
7. mission state transitions
8. cancel
9. pause/resume
10. deliberate navigation failure → mission FAILED

---

# 32. 必须做一个“故意失败”测试

仓库 `AGENTS.md` 要求新功能证明能检测有意义的错误。

本任务建议：

```text
Mission:
P1 → INVALID_POINT → P3
```

期望：

```text
P1 succeeds
INVALID_POINT navigation fails
mission => FAILED
P3 is NOT executed
failure reason visible
```

或 fixture 注入：

```text
navigation adapter returns failure
```

必须验证状态机正确失败。

---

# 33. 构建和测试命令

按仓库要求。

## Frontend

```bash
cd web
npm ci
CI=true npm test -- --watchAll=false
npm run build
```

注意：

```text
npm run lint
```

会改文件，且仓库没有独立可用的 ESLint 配置。

不要把它当 read-only check。

---

## ROS2

```bash
cd ros2
source /opt/ros/jazzy/setup.bash

colcon build --symlink-install

colcon test --packages-select openamr_ui_package openamr_ui_msgs
colcon test-result --verbose
```

如果项目自定义 ROS package 不属于这两个 package，要把对应 package 加入测试。

---

## Production UI

```bash
bash scripts/build_frontend.sh
bash scripts/sync_frontend_to_ros.sh

cd ros2
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash

ros2 launch openamr_ui_bringup ui.launch.py
```

---

# 34. Demo 验收流程

## Case A — 无机器人 Demo Mode

1. 打开 UI。
2. 开启 Demo Mode。
3. 地图正常显示。
4. 有机器人图标/pose。
5. 创建 4 个巡检点。
6. 创建任务：
   ```text
   P1 → P3 → P2 → P4
   ```
7. Run。
8. UI 依次显示：
   ```text
   1/4
   2/4
   3/4
   4/4
   ```
9. Pause。
10. 当前点不继续变化。
11. Resume。
12. 继续。
13. Cancel 测试。
14. Software Stop 测试。
15. 明确显示“非物理急停”。

---

## Case B — ROS2 仿真/fixture

验证：

```text
map
pose
nav status
mission state
battery
diagnostic
```

通过 rosbridge 到 UI。

---

## Case C — 实机

只在用户明确执行实机验证时做。

前置：

- 空旷环境；
- 低速；
- 可用并测试过的物理急停；
- 本地安全链路已启用；
- manual control 接口得到确认。

测试：

```text
single goal
P1 → P2 → P3
pause/resume
cancel
network disconnect/reconnect
software stop
localization stale/lost display
```

不要让自动化测试连接实机。

---

# 35. 最终验收标准

以下全部满足，才可以说“Demo 软件适配完成”。

## UI

- [ ] 地图正常显示
- [ ] 机器人位置正常显示
- [ ] 无 AMCL 错误文案
- [ ] 可以保存巡检点
- [ ] 可以创建巡检任务
- [ ] 可以改变巡检点顺序
- [ ] 可以启动任务
- [ ] 可以暂停
- [ ] 可以恢复
- [ ] 可以取消
- [ ] 当前任务状态可见
- [ ] 当前巡检点可见
- [ ] 总任务进度可见
- [ ] 电池状态可见
- [ ] ROS 连接状态可见
- [ ] 定位 stale/unknown 可见
- [ ] Software Stop 可见且正确标注
- [ ] 未配置 manual control 时不会误导用户可控

## Architecture

- [ ] Live mission execution 不依赖浏览器 for-loop
- [ ] 浏览器关闭后 robot-side mission 不因 UI component unmount 自动消失
- [ ] UI 不直接依赖 Hybrid A*/NeuPAN 内部代码
- [ ] ROS 接口集中配置
- [ ] 项目 ROS topic 没有散落 hardcode
- [ ] Remote control 不明确绕过本地 safety chain
- [ ] 未实现业务感知

## Quality

- [ ] Frontend tests pass
- [ ] Frontend build pass
- [ ] ROS build pass（若环境可用）
- [ ] ROS tests pass（若环境可用）
- [ ] deliberate-failure test pass
- [ ] Demo Mode manual flow verified
- [ ] Not verified 项明确记录

---

# 36. 需要 Codex 特别注意的现有源码坑

## 坑 1：浏览器 MissionRunner

它现在“看起来像任务管理器”，但本质仍是 Browser Runner。

不要只改 UI 文案就认为任务架构完成。

---

## 坑 2：Waypoint Queue

`MapPage.jsx` 当前 queue 根据：

```text
GoalStatusArray 最后一个 status
```

推进。

这只适合作为临时 Demo 工具。

正式巡检任务进度必须来自 robot-side task state。

---

## 坑 3：AMCL

`RobotState.jsx`、`LocalizationStatus.jsx` 和 relays 都有 AMCL 假设。

项目定位是 NDT。

---

## 坑 4：Nav2 ComputePathToPose

`RoutePage.jsx` 有 Nav2-specific：

```text
/compute_path_to_pose/_action/send_goal
/compute_path_to_pose/_action/get_result
```

项目 mode 下不能盲用。

---

## 坑 5：BasicNavigator

`waypoint_nav.py` 使用：

```python
BasicNavigator()
```

这是 Nav2 依赖。

不要把它直接包装一下就声称完成 Hybrid A* + NeuPAN 集成。

---

## 坑 6：Joystick raw cmd_vel

项目要求安全核心本地闭环。

如果 `/cmd_vel` 不属于经过本地 safety supervisor 的输入，不允许远端 UI 默认直发。

---

## 坑 7：STOP 的名字

当前前端叫 Emergency Stop。

必须改。

---

## 坑 8：localStorage

当前 Waypoints/Missions 与浏览器 profile 绑定。

换电脑、清缓存都会消失。

项目 Demo 最好迁移到 Flask file persistence。

---

# 37. Codex 最终交付内容

完成代码后必须给用户一个总结，格式如下。

## 1. Git

```text
Base SHA:
Head SHA:
Branch:
Files changed:
```

---

## 2. 完成内容

逐项：

```text
[PASS] UI project mode
[PASS] inspection points
[PASS] mission editor
[PASS] robot-side mission transport
...
```

---

## 3. ROS 接口表

| 能力 | Interface | Type | Verified |
|---|---|---|---|
| map | ... | ... | YES/NO |
| pose | ... | ... | YES/NO |
| nav goal | ... | ... | YES/NO |
| mission | ... | ... | YES/NO |
| soft stop | ... | ... | YES/NO |

---

## 4. 测试结果

必须写实际执行结果，不得编造：

```text
npm test
exit:
tests:

npm run build
exit:

colcon test
exit:
tests:
```

---

## 5. Manual Demo

记录：

```text
Scenario:
Observed:
Evidence:
```

---

## 6. Safety impact

明确：

```text
Physical E-STOP modified: NO
Brake/interlock modified: NO
UI Software Stop: YES
Real hardware safety validated: YES/NO
```

---

## 7. Not verified

例如：

```text
- Hybrid A* actual action interface not supplied
- NeuPAN hardware integration not run
- physical E-stop not tested
- 5G disconnect behavior not tested on real robot
```

---

## 8. Remaining owner decisions

只列真正需要用户决定的东西，例如：

```text
- final nav action name/type
- final localization state topic
- safe teleop command interface
- software-stop service
```

不要把代码本来可以自己解决的问题都丢回用户。

---

# 38. 推荐执行策略

Codex 不要一次性大改。

建议提交顺序：

```text
1. audit + project profile
2. generic localization/robot state
3. inspection point persistence
4. inspection mission UI
5. mission transport/executor adapter
6. software stop/manual control gating
7. relays/config
8. tests/docs
```

每一步保持可构建。

---

# 39. 本任务的 Done 定义

真正的“Done”不是：

```text
页面看起来像巡检平台
```

而是：

```text
用户在远端 UI 创建巡检点
        ↓
按任意顺序组成任务
        ↓
下发一次完整任务
        ↓
机器人端持有任务状态
        ↓
逐点调用导航
        ↓
UI 显示实时进度
        ↓
浏览器掉线后任务事实仍由机器人端维持
        ↓
重连后 UI 恢复状态
        ↓
可暂停 / 恢复 / 取消
        ↓
Software Stop 不被伪装成硬件急停
```

---

# 40. 最重要的约束总结

Codex 执行过程中始终遵守下面 10 条：

1. **不要重写 OpenAMRobot UI。**
2. **不要改 SLAM / NDT / Hybrid A* / NeuPAN 算法。**
3. **不要做业务感知。**
4. **正式 Mission 不在浏览器执行。**
5. **UI 不绑定 Nav2。**
6. **NDT 项目不要继续展示 AMCL 语义。**
7. **远端 joystick 不得确认绕过本地 safety。**
8. **Web STOP 只能叫 Software Stop，不是硬件 E-STOP。**
9. **找不到真实 ROS 接口时不要猜，做 adapter + fixture 并明确 BLOCKED。**
10. **Demo Mode、tests、build、Not verified 必须一起交付。**

---

# 附录 A：当前源码重点路径速查

```text
web/src/app/App.jsx
web/src/pages/registry.js
web/src/pages/MapPage.jsx
web/src/pages/MissionsPage.jsx
web/src/pages/RoutePage.jsx

web/src/components/Map.jsx
web/src/components/RobotState.jsx
web/src/components/LocalizationStatus.jsx
web/src/components/NavStatus.jsx
web/src/components/Joystick.jsx
web/src/components/WaypointLibrary.jsx
web/src/components/MissionRunner.jsx

web/src/shared/constants/index.js
web/src/shared/constants/runtimeConfig.js
web/src/shared/hooks/useSavedWaypoints.js
web/src/shared/missions/missions.js
web/src/shared/missions/missionRunner.js
web/src/shared/demo/demoData.js
web/src/shared/events/eventLog.js

ros2/src/openamr_ui_package/openamr_ui_package/map_relay.py
ros2/src/openamr_ui_package/openamr_ui_package/nav_relays.py
ros2/src/openamr_ui_package/openamr_ui_package/waypoint_nav.py
ros2/src/openamr_ui_package/openamr_ui_package/flask_app.py

ros2/src/openamr_ui_package/launch/new_ui_launch.py
ros2/src/openamr_ui_package/launch/physnode_launch.py
```

---

# 附录 B：本项目需求对照

| 项目要求 | 本次改造 |
|---|---|
| ROS2 分层 | 保持 |
| 地图 | 复用 OccupancyGrid Web map |
| NDT 定位 | UI generic localization adapter |
| Hybrid A* | 通过 navigation adapter |
| NeuPAN | UI 不直接依赖 |
| 巡检点 | 新核心功能 |
| 指定巡检顺序 | 新核心功能 |
| 任务开始/暂停/恢复/取消 | 新核心功能 |
| 当前机器人位置 | 改为项目定位源 |
| 机器人/BMS 状态 | 保留并适配 |
| 断网 | robot-side mission state |
| 远端管理 | 本 Demo 核心 |
| 急停 | 物理急停不在 UI 实现；UI 仅 Software Stop |
| 业务感知 | 不实现 |
| 日志追溯 | 复用并增强 |
| 身份认证 | 不作为当前 Demo 第一阶段核心；公网部署前必须另行完成 |

---

# 附录 C：给 Codex 的开工指令

收到本文件后直接执行：

```text
1. 阅读 AGENTS.md / CONTRIBUTING.md。
2. 记录本地 HEAD 和 working tree。
3. 对照本文件重新核对相关源文件。
4. 搜索本地机器人 ROS2 接口并生成 interface inventory。
5. 先运行未修改代码的 frontend tests/build，记录 baseline。
6. 按 Phase 1 → Phase 6 实施。
7. 每个阶段保持可构建。
8. 不执行真实机器人运动测试，除非用户明确要求并提供安全环境。
9. 最终输出实际测试证据和 Not verified。
10. 不擅自 merge，不 force push，不伪造测试结果。
```
