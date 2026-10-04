# 故障排查指南

先查看控制台的连接指示和 Health 页面。浏览器连接状态为绿色，并不能证明机器人 topic 数据是最新的。

> [!CAUTION]
> 如果机器人运动、定位或当前选中的机器人状态不明确，请停止发送命令，并先确认实体机器人状态，再继续排查。

## 按现象排查

| 现象 | 首要检查项 |
| --- | --- |
| 页面无法打开 | UI 进程和 `5050` 端口 |
| 页面已打开但连接指示为红色 | rosbridge 进程、配置的主机、防火墙和 `9090` 端口 |
| 连接指示为绿色但地图/位姿冻结 | Health 页面中的 topic 新鲜度；不要驾驶机器人 |
| 只有地图为空白 | `/map`、`/ui/map` 和 `map_volatile_relay` |
| 只有相机画面为空白 | 选中的图像 topic 和可选的 `8080` 端口服务 |
| 路线/地图按钮失效 | 可选的 `physnode_launch.py` 辅助节点 |
| UI 修改未显示 | 重新构建、同步、构建 ROS 并强制刷新 |
| WiFi 断开后 Program/Mission 卡住 | 停止程序，确认机器人静止，重新连接后再有意地重启 |

## 页面无法打开

检查 UI launch 是否正在运行：

```bash
ros2 node list | grep flask_app
```

如果通过 `scripts/run_ui_backend.sh` 启动后端，请检查该终端中的 launch 错误。确认
`ros2/src/openamr_ui_package/param/config.yaml` 中 Flask 配置为使用 `5050` 端口。仅运行前端 Demo Mode 时，
请检查 Vite 终端并打开 `http://localhost:3000/`；Vite 服务器不提供 Flask REST API。

## 浏览器未连接

确认 rosbridge 正在运行：

```bash
ros2 node list | grep rosbridge
```

检查浏览器是否能通过 `9090` 端口访问配置的 UI 主机。使用前端开发服务器时，请核对 `web/src/shared/constants/index.js`。

在浏览器开发者工具中检查连接：

1. 打开 **Network**。
2. 筛选 **WS**。
3. 检查连接到 `9090` 端口的请求。

## 已连接但数据过期

先检查相关 topic，不要立即重启 rosbridge：

```bash
ros2 topic list
ros2 topic hz /odom
ros2 topic echo /odom --once
```

检查发布者、订阅者和 QoS：

```bash
ros2 topic info /odom -v
```

请继续参阅[课程 11 — 故障模式与重连](lessons/11-failure-modes-and-reconnection.md)和
[课程 12 — 使用 ROS CLI 调试](lessons/12-debugging-with-ros-cli.md)。

## 地图空白

```bash
ros2 topic echo /map --once
ros2 topic echo /ui/map --once
ros2 node list | grep map_volatile_relay
```

地图服务器由机器人工作区负责。UI 中继节点会将 `/map` 重新发布为适合浏览器使用的 `/ui/map`。

## 相机画面缺失

检查以下项目：

- 已安装并运行 `web_video_server`。
- `8080` 端口可访问。
- 选中的图像 topic 存在。
- 图像 topic 正在发布数据。

```bash
ros2 topic list | grep image
ros2 topic hz /camera/color/image_raw
```

相机功能为可选项，与 rosbridge WebSocket 相互独立。

## 路线或地图操作失败

常规 UI launch 不会启动文件管理辅助节点。请启动：

```bash
ros2 launch openamr_ui_package physnode_launch.py
```

然后检查：

```bash
ros2 node list | grep -E "handler|nav"
ros2 topic echo /ui_message
```

## 前端修改未显示

```bash
cd /path/to/ROS2_UI
bash scripts/build_frontend.sh
bash scripts/sync_frontend_to_ros.sh

source /opt/ros/jazzy/setup.bash
bash scripts/build_ros.sh
source ros2/install/setup.bash
```

重启 launch，并按 `Ctrl+Shift+R` 强制刷新。

## 找不到 ROS 软件包

```bash
cd /path/to/ROS2_UI/ros2
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 pkg list | grep openamr_ui
```

## 收集诊断信息

Health 页面可以下载支持信息包，其中包含连接信息、健康状态汇总、近期事件、指标、运行时配置和 Nav2 参数。

分享之前，请检查其中是否包含凭据、内部地址或敏感运行数据。
