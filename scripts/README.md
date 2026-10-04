# 项目脚本

这些脚本用于构建并启动前端和 ROS 2 UI 工作区。可从任意目录运行；每个脚本都会根据自身位置解析仓库根目录。

## 构建前端

```bash
bash scripts/build_frontend.sh
```

使用 `npm ci` 根据 `web/package-lock.json` 安装依赖，并在 `web/build/` 中生成生产构建文件。

## 将前端复制到 ROS 软件包

```bash
bash scripts/sync_frontend_to_ros.sh
```

将 `web/build/` 复制到 `ros2/src/openamr_ui_package/openamr_ui_package/static/app/`。
请先构建前端。

## 构建 ROS 工作区

加载 ROS 2 Jazzy 环境后运行：

```bash
source /opt/ros/jazzy/setup.bash
bash scripts/build_ros.sh
```

该脚本会在 `ros2/` 中运行 `colcon build --symlink-install`。

## 启动 UI 后端

构建并加载 ROS 工作区后运行：

```bash
source /opt/ros/jazzy/setup.bash
source ros2/install/setup.bash
bash scripts/run_ui_backend.sh
```

该脚本会运行 `ros2 launch openamr_ui_bringup ui.launch.py`。另一个脚本
`scripts/container_entrypoint.sh` 需要 `/workspace` 中已有可用环境；当前检出版本没有用于构建或运行该环境的
Dockerfile 或 Compose 配置。

## 其他脚本

`create_asset_video.sh`、`create_narrated_video.sh` 和
`add_feature_tour_voiceover.sh` 是媒体处理工具，不属于 UI 构建或启动流程。功能导览生成器需要
`docs/assets/` 下的截图；当前检出版本不包含这些源素材。
