# Launch 文件

当前 launch 文件：

- `new_ui_launch.py`：UI 软件包的主 launch。启动 Flask、rosbridge、rosapi、web video server、
  `map_relay` 和 `nav_relay`。手动启动时，它可以读取 `../.env`（软件包专属且已加入 Git 忽略列表，
  参见 `../.env.example`），并通过 `additional_env` 仅将其中的值传给 `flask_app`。它也会读取父进程中的
  `ANTHROPIC_API_KEY`。请将 API 密钥保存在环境变量或已忽略的软件包 `.env` 文件中，不要提交密钥。
  如果两处均未提供密钥，`/api/voice-plan` 会返回 500，launch 日志会说明如何配置。
- `physnode_launch.py`：可选辅助 launch，用于地图/路线文件操作和 waypoint 路线跟随。
- `map_server_launch.py`：已弃用的兼容性 launch，使用 `ui_legacy` 命名空间。
`mapping_launch.py`（包含 `gmapping_launch.py` 和 `move_base_launch.py`）及
`navigation_launch.py`（包含 `move_base_launch.py` 和 `amcl_launch.py`）**不是旧版实现**：
`folders_handler.py` 中的 `build_map_func`/`save_map_func` 会直接启动它们；Web UI 的 Maps 页面
**Start mapping**/**Save current map** 按钮实际触发的就是这两个 launch。单独的 `amcl_launch.py`、
`gmapping_launch.py` 和 `move_base_launch.py` 只是这两个 launch 组合使用的组件，不应单独启动。

常规使用方法请参阅仓库根目录的 `README.md`，建议使用
`openamr_ui_bringup ui.launch.py`。
