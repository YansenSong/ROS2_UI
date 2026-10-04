# Python 软件包

此目录包含 `openamr_ui_package` 的 Python ROS 节点。

- `flask_app.py`：编译后的 React 应用使用的 Flask 服务器。
- `map_relay.py`：将 `/map` 转发到 `/ui/map` 的 QoS 中继节点。
- `nav_relays.py`：AMCL 和 action 状态中继节点。
- `folders_handler.py`：地图、分组、路线和 waypoint 文件操作。
- `waypoint_nav.py`：可选 waypoint 路线跟随辅助节点。
- `static/app/`：从 `web/build/` 复制的 React 生产构建文件。
