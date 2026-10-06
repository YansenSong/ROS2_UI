# Launch 文件

当前 launch 文件：

- `new_ui_launch.py`：UI 软件包的主 launch。启动 Flask、rosbridge、rosapi、web video server、
  `map_relay` 和 `nav_relay`。手动启动时，它可以读取 `../.env`（软件包专属且已加入 Git 忽略列表，
  参见 `../.env.example`），并通过 `additional_env` 仅将其中的值传给 `flask_app`。它也会读取父进程中的
  `ANTHROPIC_API_KEY`。请将 API 密钥保存在环境变量或已忽略的软件包 `.env` 文件中，不要提交密钥。
  如果两处均未提供密钥，`/api/voice-plan` 会返回 500，launch 日志会说明如何配置。
- `physnode_launch.py`：旧版可选辅助 launch。它会启动面向 Nav2 `NavigateToPose` 的 waypoint 跟随器；
  AckermannRobot 当前仿真没有启动该 action server，因此路线编辑页面不使用此跟随器。
- `ui.launch.py`：启动 Web UI、`ackermann_route_store` 和仅处理地图/分组命令的 `folders_handler`。这样地图管理页的
  创建、重命名和删除操作都有后端接收，同时不让旧路线文件处理器重复处理路线编辑页命令。路线按当前 `/map` 的地图内容指纹保存在
  `~/.ros/ackermann_robot/routes/`，不会切换地图，也不依赖旧版地图/导航启动流程。路线目录使用
  `/ackermann/routes/request` 和 `/ackermann/routes/catalog`，与地图管理的 `/nav_data_req`、`/nav_data_resp`
  分开；地图名称别名持久化在 `routes/map_identities.json`，重命名地图时关联路线会同步显示新名称。
- `map_server_launch.py`：已弃用的兼容性 launch，使用 `ui_legacy` 命名空间。
`mapping_launch.py`（包含 `gmapping_launch.py` 和 `move_base_launch.py`）及
`navigation_launch.py`（包含 `move_base_launch.py` 和 `amcl_launch.py`）**不是旧版实现**：
`folders_handler.py` 中的 `build_map_func`/`save_map_func` 会直接启动它们；Web UI 的 Maps 页面
**Start mapping**/**Save current map** 按钮实际触发的就是这两个 launch。单独的 `amcl_launch.py`、
`gmapping_launch.py` 和 `move_base_launch.py` 只是这两个 launch 组合使用的组件，不应单独启动。

常规使用方法请参阅仓库根目录的 `README.md`，建议使用
`openamr_ui_bringup ui.launch.py`。
