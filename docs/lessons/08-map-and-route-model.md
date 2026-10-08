# 课程 08——Map 和 Route 文件模型

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 建图操作员和后端开发者 | 10 分钟 | [课程 05](05-backend-nodes-in-detail.md) |

## 学习目标

了解 group → map → route 的层级、文件存放位置，以及单一 active context 如何影响编辑和 navigation。

[课程 07](07-ui-components.md)介绍了 Route 页面的 modals。本课介绍其背后的文件模型，解释 Route 页 `Group`/`Map`/`Route` 标题的含义，也说明调试“保存的 route 为什么没有出现”时最需要检查什么。此模型完全由 ROS 侧的[`folders_handler.py`](05-backend-nodes-in-detail.md#folders_handlerpy--the-node-behind-the-route-page)管理。

## 三层结构：group → map → route

所有内容都按固定的三层层级组织：

```text
Group        （例如 "Warehouse"、"Welcome"）
  Map          （例如 "FloorA"、"Start"，一个已保存的 occupancy grid）
    Route        （例如 "MorningPatrol"，一组已保存的 waypoint 序列）
```

**group** 是文件夹级别的容器，通常代表建筑物或场地。**map** 是 group 中保存的一张 occupancy grid，通常对应一层楼或房间布局。**route** 是一组已命名的 waypoint 序列，只对它绘制所在的 map 有意义。[课程 07](07-ui-components.md#the-route-page-modals)提到某张 map 上创建的 route 不能直接用于另一张 map；文件层级保证了这一点：route 实际存放在 map 的文件夹中，而不是与 map 并列。

## 文件实际存放位置

```text
ros2/src/robotpilot_ui_package/maps/<group>/<map>.yaml       # 标准 ROS map_server YAML
ros2/src/robotpilot_ui_package/maps/<group>/<map>.png        # occupancy grid 图像
ros2/src/robotpilot_ui_package/maps/<group>/<map>_ros.yaml   # 每张 map 的 launch 参数覆盖文件
ros2/src/robotpilot_ui_package/paths/<group>/<map>/<route>.csv
```

文件夹说明见[`maps/README.md`](../../ros2/src/robotpilot_ui_package/maps/README.md)和[`paths/README.md`](../../ros2/src/robotpilot_ui_package/paths/README.md)。重命名 map（`folders_handler.py` 的 `rename_map_func`）需要处理三个 map files，并移动对应的 route folder。这说明此操作由专门的 backend node 管理更合适，不应让 frontend 通过通用文件 API 调用 `os.rename`：保持四条相关路径一致，需要由一个明确的负责人完成。

route CSV 的每一行代表一个 waypoint：位置（`x,y,z`）、四元数形式的方向（`x,y,z,w`）、三个预留数值字段，以及结尾的 “purpose” 标记，共 11 个逗号分隔值。Route 页面和 `folders_handler.py` 需要遵循这一格式；UI 其他部分不会直接读取 route CSV。

<a id="the-active-context-one-file-always-current"></a>
## Active context：始终只有一个文件

任一时刻只有一张 map 和一条 route 处于 active 状态；它们显示在 Route 页面，并由[`waypoint_nav.py`](05-backend-nodes-in-detail.md#waypoint_navpy--a-second-subscriber-on-the-same-topic)使用。状态保存在唯一文件中：

```text
ros2/src/robotpilot_ui_package/param/current_map_route.yaml
```

其中有 `map_file` 和 `route_file` 两个 key，各自保存完整文件系统路径。每项操作（`Change`、`Save`、`Delete`，以及打开 Route 页面）都会读取或重写此文件。Route 页面标题中显示的 `Group`/`Map`/`Route` 名称不会另行保存，而是从当前文件路径末尾拆分得出（参见 `folders_handler.py` 中的 `get_paths()`）。

如果 map 或 route 意外重置，需留意启动时 `folders_handler.py` 会检查 `map_file`/`route_file` 指向的路径是否存在；如果路径包含字面字符串 `"darkadius"`，也会重置。这是遗留的路径检查，用于处理从另一台开发机留下的过期绝对路径。任一情况都会回退到内置默认项（`Welcome/Start`）。如果 active map/route 总是无故回到 `Welcome/Start`，先检查 `current_map_route.yaml` 是否保存了过期或来自其他机器的绝对路径。

## 试一试

查看当前 map/route 配置，并在不修改文件的情况下追踪一条 active route 对应的 CSV。确认其所属的 group 和 map。

**完成标准：**能指出当前 active group、map 和 route，并说明为什么不能假定一条 route 适用于其他 map。

## 下一课

[课程 10——Topic 作为接口契约](10-topics-as-the-contract.md)将说明 UI 与机器人之间的 topic 命名约定。

---

[← 课程 07](07-ui-components.md) · [课程索引](README.md) · [下一课：课程 10 →](10-topics-as-the-contract.md)
