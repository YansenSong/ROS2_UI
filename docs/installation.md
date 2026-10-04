# 安装与启动

本指南介绍当前检出版本中实际存在的文件和命令。仓库包含 React 前端和 ROS 2 UI 工作区，
不包含机器人驱动、Nav2、定位或仿真工作区。

仓库根目录目前没有 `Dockerfile` 或 Docker Compose 配置。可通过仅运行浏览器的方式体验 UI，
也可构建并启动 ROS 2 工作区，以运行 Flask 后端并连接实时 ROS 数据。

## 选择运行方式

| 目标 | 要求 | 从这里开始 |
| --- | --- | --- |
| 使用 Demo Mode 体验 UI | Node.js 和 npm | [仅在浏览器中运行 Demo Mode](#browser-only-demo-mode) |
| 开发 React 前端 | Node.js 和 npm | [前端开发](development.md#frontend-development) |
| 提供构建后的 UI 并连接 rosbridge | ROS 2 Jazzy、colcon、Node.js 和 npm | [构建并启动 UI 工作区](#build-and-launch-the-ui-workspace) |
| 操作机器人或仿真器 | UI 工作区及单独运行、topic 兼容的 ROS 2 系统 | [连接机器人或仿真器](#connect-to-a-robot-or-simulator) |

## 环境要求

- 启用 JavaScript 的浏览器。
- Node.js `20.19+` 或 `22.12+`（支持 Node 24）以及 npm，与 `web/package.json` 中声明的版本一致。
- 构建 ROS 工作区需要 Ubuntu 24.04、ROS 2 Jazzy、`colcon` 和 `rosdep`。
- 只有在需要实时机器人数据和控制时才需要 ROS 2 机器人或仿真器。它们不属于本仓库，且必须发布 UI 所需的 topic 和 service 接口。连接其他机器人软件栈前，请查看[接口清单](project/robot_interface_inventory.md)。

<a id="browser-only-demo-mode"></a>
## 仅在浏览器中运行 Demo Mode

Demo Mode 会在浏览器中生成示例遥测数据，无需 ROS 2、rosbridge 或机器人。直接运行前端：

```bash
cd web
npm ci
npm run dev
```

打开 `http://localhost:3000/`，然后在 Config 页面启用 **Demo Mode**（也可使用首次启动引导）。
页面会持续显示横幅，标明遥测数据为模拟数据。要停止开发服务器，请在终端按 `Ctrl+C`。

Vite 服务器只提供前端。调用 Flask `/api/*` 的功能还需要单独运行 ROS UI 后端；Demo Mode
只模拟 ROS 传输，不会替代这些 REST endpoint。

<a id="build-and-launch-the-ui-workspace"></a>
## 构建并启动 UI 工作区

以下步骤从仓库根目录运行，用于构建前端、将其复制到 ROS 包中，并构建 `ros2/src/` 下的三个软件包。

先安装前端和 ROS 软件包依赖：

```bash
cd web
npm ci
cd ../ros2
source /opt/ros/jazzy/setup.bash
sudo apt install python3-rosdep python3-colcon-common-extensions
# 新机器首次运行下一条命令前，请先执行一次 `sudo rosdep init`。
rosdep update
rosdep install --from-paths src --ignore-src -r -y
```

然后构建前端和 ROS 工作区：

```bash
cd ..
bash scripts/build_frontend.sh
bash scripts/sync_frontend_to_ros.sh
source /opt/ros/jazzy/setup.bash
bash scripts/build_ros.sh
```

存在 lockfile 时，构建脚本会使用 `npm ci`。ROS 构建脚本会在 `ros2/` 中运行
`colcon build --symlink-install`。

在已加载 ROS 环境的终端中启动 UI：

```bash
source /opt/ros/jazzy/setup.bash
source ros2/install/setup.bash
bash scripts/run_ui_backend.sh
```

也可以直接启动 bringup 软件包：

```bash
ros2 launch openamr_ui_bringup ui.launch.py
```

打开 `http://127.0.0.1:5050/`。要从其他计算机访问，请使用 UI 所在计算机可达的地址，
例如 `http://<ui-host>:5050/`。

ROS 工作区包含以下软件包：

- `openamr_ui_bringup` — UI 顶层 launch 入口。
- `openamr_ui_package` — Flask 应用、launch 文件、中继节点、辅助节点、参数、地图、路线和同步后的前端。
- `openamr_ui_msgs` — 自定义 ROS 消息定义。

主 launch 会启动 Flask 以及地图/导航中继节点。如果已安装相应软件包，也会启动
`rosbridge_server`、`rosapi` 和 `web_video_server`。缺少可选软件包时，launch 会记录提示后继续：
实时 ROS 连接需要 rosbridge，topic 列表辅助功能需要 rosapi，相机串流需要 web_video_server。

<a id="connect-to-a-robot-or-simulator"></a>
## 连接机器人或仿真器

请单独启动机器人或仿真器软件栈，并确保它与 UI 主机使用相同的 ROS domain 和网络。本仓库
不提供通用的机器人 bringup 命令。UI 侧 launch 提供控制台、Flask API、rosbridge、可选相机服务器
和面向浏览器的中继节点；不会启动机器人驱动、Nav2、定位组件或传感器。

浏览器通常通过 `9090` 端口连接 rosbridge。前端可以自动选择主机，也可以使用 Config 页面保存的
覆盖设置。UI 侧默认值位于
[`ros2/src/openamr_ui_package/param/config.yaml`](../ros2/src/openamr_ui_package/param/config.yaml)，
前端默认值位于
[`web/src/shared/constants/index.js`](../web/src/shared/constants/index.js).
依赖显示的数据前，请确认配置中的 topic 名称和消息类型与正在运行的 ROS graph 一致。

操作真实硬件时，请使用机器人上经过验证的实体急停装置。控制台中的软件停止功能不能替代实体急停。

## 可选辅助节点

UI launch 不会启动地图/路线文件管理辅助节点。需要这些操作时，请在另一个已加载 ROS 工作区的终端中启动：

```bash
ros2 launch openamr_ui_package physnode_launch.py
```

此 launch 会启动 `folders_handler` 和 `waypoint_nav`。

## 网络端口

| 端口 | 协议 | 服务 |
| --- | --- | --- |
| `5050` | HTTP（配置证书时可使用 HTTPS） | Flask UI 和 REST API |
| `9090` | WebSocket | 浏览器到 ROS 的 rosbridge 连接 |
| `8080` | HTTP | 可选的 `web_video_server` 相机串流 |

Vite 开发服务器使用 `3000` 端口。

## 可选的 Voice Command 配置

语音规划 API 需要 `ANTHROPIC_API_KEY`。如需从软件包目录下的环境文件读取密钥，请复制示例文件并编辑副本：

```bash
cd ros2/src/openamr_ui_package
cp .env.example .env
```

UI launch 会读取此受 Git 忽略的 `.env` 文件，并将其中的值传给 Flask。也可以在启动前将
`ANTHROPIC_API_KEY` 设置为环境变量。未提供密钥时，UI 其他功能仍可运行，但
`/api/voice-plan` 会返回错误。请勿提交 `.env` 文件，也不要在浏览器代码中暴露密钥。

## 构建生成文件

构建过程会创建或更新以下生成目录：

```text
web/node_modules/
web/build/
ros2/build/
ros2/install/
ros2/log/
```

请勿直接编辑这些生成文件。修改 `web/` 或 `ros2/src/` 下的源文件后重新构建。

## 后续阅读

- [开发指南](development.md)
- [故障排查指南](troubleshooting.md)
- [课程 00 — 前 10 分钟](lessons/00-your-first-10-minutes.md)
