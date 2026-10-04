# OpenAMR UI 软件包

此 ROS 2 软件包包含 OpenAMR 浏览器 UI 使用的 Flask 服务器、rosbridge 启动集成、相机网页串流启动集成、
地图/导航中继节点，以及可选的地图/路线辅助节点。

工作区设置、构建和运行命令、端口、topic 及故障排查的权威说明请参阅仓库根目录的 `../../../README.md`。

## Launch 文件

- `launch/new_ui_launch.py`：启动 Web UI 服务和适用于浏览器的中继节点。
- `launch/physnode_launch.py`：启动可选的地图/路线文件操作辅助节点和 waypoint 路线跟随辅助节点。
- `launch/map_server_launch.py`：已弃用的兼容性 launch，使用 `ui_legacy` 命名空间，避免与平台地图服务器冲突。
- `launch/mapping_launch.py`（包含 `gmapping_launch.py` 和 `move_base_launch.py`）及
  `launch/navigation_launch.py`（包含 `move_base_launch.py` 和 `amcl_launch.py`）：并非旧版实现；
  Web UI 的 Maps 页面 **Start mapping** 和 **Save current map** 按钮会由 `folders_handler.py` 直接启动它们
  （建图时使用 SLAM，保存后切回定位/导航）。

## 运行时组件

- `flask_app.py`：提供编译后的 React 应用。
- `map_relay.py`：以适合浏览器的 QoS 将 `/map` 重新发布到 `/ui/map`。
- `nav_relays.py`：将 AMCL 和导航/对接 action 状态重新发布到 `/ui/*`。
- `folders_handler.py`：处理地图、分组、路线和 waypoint 文件命令。
- `waypoint_nav.py`：可选的路线跟随辅助节点，使用 Nav2 Simple Commander。
- `battery.py`：可选的电量百分比发布器（读取串口；未检测到串口时改为模拟电量消耗）。默认情况下，
  `new_ui_launch.py` 和 `physnode_launch.py` 都不会启动它。

## Voice Command API 密钥

`flask_app.py` 会从环境变量中读取 `ANTHROPIC_API_KEY`，供 `/api/voice-plan` endpoint
（Blockly 的 Voice Command 功能）使用。将本目录中的 `.env.example` 复制为 `.env` 并设置密钥。
`.env` 已加入 Git 忽略列表；`launch/new_ui_launch.py` 会读取它，并且只将密钥传给 `flask_app` 节点进程，
因此无需在 shell 中执行 `export`。详情请参阅 [launch/README.md](launch/README.md)。

## 静态应用

React 源码位于仓库根目录的 `web/` 中。生产资源构建后会复制到：

```text
openamr_ui_package/static/app/
```

请使用仓库根目录的脚本：

```bash
cd ~/openamrobot-ui
bash scripts/build_frontend.sh
bash scripts/sync_frontend_to_ros.sh
```

然后在 `ros2/` 工作区中构建 ROS 2 工作区：

```bash
cd ~/openamrobot-ui/ros2
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
```

也可以在仓库根目录使用辅助脚本：

```bash
cd ~/openamrobot-ui
source /opt/ros/jazzy/setup.bash
bash scripts/build_ros.sh
source ros2/install/setup.bash
```

加载环境后，确认软件包已安装：

```bash
ros2 pkg prefix openamr_ui_package
```

运行推荐的 UI launch：

```bash
ros2 launch openamr_ui_bringup ui.launch.py
```

在浏览器中打开：

```text
http://127.0.0.1:5050/
```
