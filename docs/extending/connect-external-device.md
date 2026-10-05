# 接入外部设备

本指南通过实操说明，如何让新的 **sensor**（仅由 UI *观测*的设备，例如 camera、temperature probe、新增的 lidar）或 **actuator**（由 UI *控制*的设备，例如 gripper、light、secondary motor）显示在浏览器中或可从浏览器控制；也适用于机器人侧的其他新 ROS topic。假设设备已经在机器人/仿真工作区中的某处发布（或将要发布）ROS 2 topic。本 UI 工作区不会直接与硬件通信，只使用 ROS topics 和 services（见[课程 01](../lessons/01-what-is-this-ui.md)）。

## 1. 定义或复用 ROS topic

确定设备要发布的 topic name 和 message type；如果是 actuator，则确定 UI 要发布命令的 topic。优先复用标准 message type（`std_msgs`、`sensor_msgs`、`geometry_msgs` 等），不要轻易创建新类型。若没有合适的标准类型，可以在[`ros2/src/openamr_ui_msgs/msg/`](../../ros2/src/openamr_ui_msgs/msg/)中新增 custom message，与现有的 `ArrayPoseStampedWithCovariance.msg` 放在一起。

这一步完全在机器人/仿真侧完成。本 UI 工作区不定义设备发布什么，只负责消费相应数据。

## 2. 判断是否需要 relay

先问：**topic 是否为 TRANSIENT_LOCAL（latched），或是否可能在浏览器订阅前就已发布？**如果是，浏览器 client 通过 rosbridge 连接时可能收不到消息。`/map` 和 AMCL pose 也有同样的问题，详细说明见[课程 04](../lessons/04-data-flow-and-relays.md)。

- **如果 topic 是持续发布的普通 VOLATILE stream**（大多数 sensor data，例如 laser scans、持续更新的 odometry-like readings），跳过此步骤，在第 3 步直接从面板订阅。
- **如果 topic 是 latched、低频发布或类似 status 的数据**（例如单次发布的 configuration message，或只偶尔变化的状态），新增一个 relay node。单 topic 可参考[`ros2/src/openamr_ui_package/openamr_ui_package/map_relay.py`](../../ros2/src/openamr_ui_package/openamr_ui_package/map_relay.py)；在同一个 node 中处理多个 topics 可参考[`ros2/src/openamr_ui_package/openamr_ui_package/nav_relays.py`](../../ros2/src/openamr_ui_package/openamr_ui_package/nav_relays.py)。浏览器侧 topic 建议使用 `/ui/` 前缀，遵循现有约定。例如，新设备 topic `/battery_temperature` 只有在确实需要 QoS conversion 时才转发为 `/ui/battery_temperature`；否则直接使用 `/battery_temperature`。

在[`ros2/src/openamr_ui_package/launch/new_ui_launch.py`](../../ros2/src/openamr_ui_package/launch/new_ui_launch.py)中注册新增的 relay node，参照已有的 `map_relay`/`nav_relay` `Node(...)` entries。它应属于同一个 package；`executable` name 必须与添加到该 package `setup.py` entry points 中的名称一致。

## 3. 在 frontend constants file 中声明 topic name

将浏览器最终订阅的 topic name（relay 后或直接使用的名称）作为新 key 加到[`web/src/shared/constants/index.js`](../../web/src/shared/constants/index.js)中的 `AppConfig`。今后 topic 重命名时，只需在这一个位置更新，见[课程 10](../lessons/10-topics-as-the-contract.md)。

```js
// web/src/shared/constants/index.js
export const AppConfig = {
  // ...existing keys
  BATTERY_TEMPERATURE_TOPIC: "/ui/battery_temperature",
};
```

## 4. 在面板中显示数据

遵循[`add-a-ui-panel.md`](add-a-ui-panel.md)：在[`web/src/components/`](../../web/src/components/)下新增 component，或扩展现有 component。如果只是为现有 status panel 添加少量内容，可以参考[`web/src/components/SystemHealth.jsx`](../../web/src/components/SystemHealth.jsx)：它会监视 topic 列表并显示 online/offline status，新 stream 也可以按这种模式接入。

使用 `useRos()` 获取共享 connection，通过第 3 步添加的 constant 订阅 topic，并将收到的 state 渲染出来。

如果接入的是 actuator，UI 要*控制*而不是*观测*它，则步骤相同，但面板会向 topic publish。可参考[`web/src/components/DockingControl.jsx`](../../web/src/components/DockingControl.jsx)：它发布 trigger，并另行订阅 status topic 以反映执行结果。

<a id="5-confirm-it-end-to-end"></a>
## 5. 端到端确认

1. 启动机器人/仿真工作区，并让设备（实体设备或模拟设备）开始发布。
2. 启动本 UI 工作区（`ros2 launch openamr_ui_bringup ui.launch.py`，完整启动说明见主 [README](../../README.md)）。
3. 如果新增了 relay，先确认 relay 正在运行，并检查浏览器侧 topic 是否有数据，再排查 frontend：
   ```bash
   ros2 node list | grep <your_relay_node_name>
   ros2 topic echo <your_ui_facing_topic>
   ```
4. 在浏览器中打开对应页面/面板，确认新数据已显示。

如果 `ros2 topic echo` 能看到数据，但浏览器中没有显示，问题在 frontend 一侧（constant 错误、subscription 未接入或 message type 不匹配），而不在 ROS 侧。如果 `ros2 topic echo` 没有输出，问题位于本 UI 工作区的上游。
