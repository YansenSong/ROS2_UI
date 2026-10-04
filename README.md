# OpenAMRobot UI

基于 React 的 ROS 2 机器人浏览器界面。本仓库包含前端和 UI 侧 ROS 工作区；
不包含机器人驱动、Nav2、定位组件或仿真器。

## 使用 Demo Mode 运行前端

需要 Node.js `20.19+` 或 `22.12+`（支持 Node 24）以及 npm。

```bash
cd web
npm ci
npm run dev
```

打开 `http://localhost:3000/`，在 Config 页面或首次启动引导中启用
**Demo Mode**。Demo Mode 会在浏览器中生成 ROS 示例遥测数据，无需连接机器人或
rosbridge。Vite 服务器只提供前端；使用 Flask `/api/*` 路由的功能还需要启动 UI 后端。

## 构建并运行 UI 后端

ROS 工作区面向 ROS 2 Jazzy。安装 ROS 依赖后，从仓库根目录构建：

```bash
cd ros2
source /opt/ros/jazzy/setup.bash
rosdep install --from-paths src --ignore-src -r -y
cd ..
bash scripts/build_frontend.sh
bash scripts/sync_frontend_to_ros.sh
source /opt/ros/jazzy/setup.bash
bash scripts/build_ros.sh
source ros2/install/setup.bash
bash scripts/run_ui_backend.sh
```

打开 `http://127.0.0.1:5050/`。UI launch 会启动 Flask 和面向浏览器的 ROS 节点；
如果已安装相应软件包，还会启动 `rosbridge_server`、`rosapi` 和
`web_video_server`。它不会启动机器人驱动、Nav2、定位组件、传感器或仿真器；
如需实时数据，请另行启动兼容的机器人或仿真器 ROS 工作区。

当前检出版本没有 Dockerfile 或 Docker Compose 配置。完整安装、可选 launch 辅助节点、
端口和依赖说明请参阅[安装与启动](docs/installation.md)；Vite 服务器、构建步骤和源码
目录说明请参阅[开发指南](docs/development.md)。

## 仓库目录结构

- `web/` — React 应用、Vite 配置、浏览器端 ROS 库和前端依赖。
- `ros2/src/openamr_ui_package/` — Flask API、ROS launch 文件、中继节点、参数、地图和路线数据。
- `ros2/src/openamr_ui_bringup/` — UI 顶层启动包。
- `ros2/src/openamr_ui_msgs/` — 自定义 ROS 消息包。
- `scripts/` — 前端构建与同步、ROS 构建与运行脚本。
- `docs/` — 安装、开发、故障排查、课程和扩展指南。

前端使用的 ROS topic 名称定义在
[`web/src/shared/constants/index.js`](web/src/shared/constants/index.js).
连接其他机器人软件栈之前，请查阅[机器人接口清单](docs/project/robot_interface_inventory.md)，
并对照 ROS graph 核实 topic 名称和消息类型。

## 文档

- [安装与启动](docs/installation.md)
- [开发指南](docs/development.md)
- [故障排查](docs/troubleshooting.md)
- [课程](docs/lessons/README.md)
- [扩展指南](docs/extending/README.md)
- [机器人接口清单](docs/project/robot_interface_inventory.md)
