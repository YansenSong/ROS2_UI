# 开发指南

当前检出版本包含两个源码区域：`web/` 中的 React 前端和 `ros2/` 中的 ROS 2 工作区。
`scripts/` 中的脚本用于构建并连接两者。此版本没有 Docker Compose 部署配置。

<a id="frontend-development"></a>
## 前端开发

需要 Node.js `20.19+` 或 `22.12+`（支持 Node 24）以及 npm。

```bash
cd web
npm ci
npm run dev
```

Vite 在 `http://localhost:3000/` 提供服务，并绑定到 `0.0.0.0`。按 `Ctrl+C` 停止服务。
开发服务器无需 ROS 即可渲染页面。在 Config 中启用 **Demo Mode** 后，无需连接机器人，
即可向 ROS 订阅者提供模拟遥测数据。

开发服务器只提供前端。调用 Flask `/api/*` 路由需要单独运行 ROS UI 后端。要读取实时 ROS 数据，
浏览器还必须能够访问 Config 中配置的 rosbridge 主机和端口（默认端口为 `9090`）。未设置主机覆盖值时，
前端会在运行时解析主机；`ROSBRIDGE_SERVER_IP` 位于
[`web/src/shared/constants/index.js`](../web/src/shared/constants/index.js) 中的值用作本地开发环境的回退设置。

### Inspection 导航配置

如需使用 inspection 导航配置构建或运行 UI，请在执行命令前设置以下任一受支持的 Vite 变量：

```bash
VITE_UI_PROFILE=inspection_demo npm run dev
```

运行 `npm run build` 前也可以设置相同变量。为保持兼容，也接受 `REACT_APP_UI_PROFILE`。
该配置会更改导航和任务标签，不会提供单独的后端或机器人接口。

## 构建前端和 ROS 工作区

如需通过 Flask 提供 UI，请先构建并同步前端，再构建 ROS 工作区：

```bash
cd /path/to/ROS2_UI
bash scripts/build_frontend.sh
bash scripts/sync_frontend_to_ros.sh
source /opt/ros/jazzy/setup.bash
bash scripts/build_ros.sh
```

`build_frontend.sh` 会安装 lockfile 中锁定的 npm 依赖，并将 Vite 生产构建输出到 `web/build/`。
`sync_frontend_to_ros.sh` 会将构建结果复制到
`ros2/src/openamr_ui_package/openamr_ui_package/static/app/`。`build_ros.sh` 会在 `ros2/`
目录中运行 `colcon build --symlink-install`。

加载 ROS 和工作区环境后启动后端：

```bash
source /opt/ros/jazzy/setup.bash
source ros2/install/setup.bash
bash scripts/run_ui_backend.sh
```

修改前端代码后，请重新执行构建、同步和 ROS 构建步骤，重启后端并强制刷新浏览器。源码位于
`web/src/` 和 `ros2/src/`；`web/build/`、`ros2/build/`、`ros2/install/` 和
`ros2/log/` 是生成目录。

## ROS 2 工作区开发

文档中的 ROS 目标版本为 Jazzy。根据各软件包清单安装依赖后进行构建：

```bash
cd ros2
source /opt/ros/jazzy/setup.bash
rosdep install --from-paths src --ignore-src -r -y
colcon build --symlink-install
source install/setup.bash
```

工作区包含 `openamr_ui_package`、`openamr_ui_msgs` 和 `openamr_ui_bringup`。
UI launch 不会启动机器人驱动、Nav2、定位组件、传感器或仿真器；这些属于独立的 ROS 2 工作区。

## 现有检查

在 `web/` 目录中运行前端检查：

```bash
cd web
npm test
npm run build
npm run lint
```

`npm run lint` 会以检查模式运行 Prettier。检查 ROS 软件包时，请加载 ROS 和工作区环境，然后运行：

```bash
cd ros2
source /opt/ros/jazzy/setup.bash
source install/setup.bash
colcon test --packages-select openamr_ui_package openamr_ui_msgs
colcon test-result --verbose
```

这些命令会运行仓库中已有的测试，但不能替代针对匹配机器人或仿真器接口的测试。

## 修改位置

| 修改内容 | 源码位置 |
| --- | --- |
| 添加或修改页面 | `web/src/pages/` 和 `web/src/pages/registry.js` |
| 修改前端 topic 名称 | `web/src/shared/constants/index.js` |
| 修改 ROS 侧中继或 launch 行为 | `ros2/src/openamr_ui_package/` |
| 修改 Flask API | `ros2/src/openamr_ui_package/openamr_ui_package/flask_app.py` |
| 修改消息定义 | `ros2/src/openamr_ui_msgs/` |
| 查看 topic 和类型要求 | [机器人接口清单](project/robot_interface_inventory.md) |
| 添加 UI 面板 | [面板指南](extending/add-a-ui-panel.md) |
| 添加外部设备 | [外部设备指南](extending/connect-external-device.md) |

## 集成边界

Topic 名称和类型必须与机器人侧 ROS graph 一致。接口清单记录了 UI 当前的预期，并区分已有接口和提案。
仅凭页面或 Demo Mode 能正常显示，不能断定该页面已与某台机器人完成集成。
