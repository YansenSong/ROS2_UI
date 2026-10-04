# 课程 05——后端节点详解

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 后端开发者和维护者 | 15 分钟 | [课程 04](04-data-flow-and-relays.md) |

## 学习目标

了解 Flask server 和可选辅助节点各自的职责，以及为什么 frontend assets 必须经过构建、同步和安装。

[课程 04](04-data-flow-and-relays.md)介绍了[`ros2/src/openamr_ui_package/openamr_ui_package/`](../../ros2/src/openamr_ui_package/openamr_ui_package/)中的两个节点：`map_relay.py` 和 `nav_relays.py`。本课介绍该 package 其余会运行的内容：web server、Route 页文件操作所用的两个节点，以及 battery 节点。与[课程 07](07-ui-components.md)一样，本课会逐个说明节点及其容易忽略的细节。

<a id="flask_apppy--two-unrelated-jobs-in-one-process"></a>
## flask_app.py — two unrelated jobs in one process

`flask_app.py`（可执行入口 `flask`，ROS node 名称 `flask_app`）把两项互不相关、但都需要在 UI 计算机上运行的工作放进同一个进程。

**工作一：提供编译后的 React 应用。** `serve_spa()` 是一个 catch-all route：请求路径对应 build 输出中的真实文件时就提供该文件；否则一律返回 `index.html`。因此，直接刷新 `/control` 或 `/blocks` 等 deep link 也能正常工作：磁盘上并没有 `/control` 文件，`index.html` 加载后由 React Router 读取 URL 并显示相应页面。

理解最常见的“我改了代码，为什么没变化”问题，关键是 `REACT_BUILD_DIR` 并不是 `web/build/`，而是 `get_package_share_directory("openamr_ui_package")/app`，即**已安装** ROS package 内的目录。该目录由三步流程更新：`npm run build`（或 `scripts/build_frontend.sh`）将 `web/src` 编译到 `web/build/`；`scripts/sync_frontend_to_ros.sh` 将内容复制到 `ros2/src/openamr_ui_package/openamr_ui_package/static/app/`；随后 `colcon build` 将其安装到 Flask 实际读取的 package share directory。只编辑 `web/src` 不会改变这三份副本中的任何一份，Flask 仍会提供上一次安装的内容。

因此，本工作区的 frontend 改动需要完整的 rebuild-and-reinstall 流程（见[开发指南](../development.md#production-frontend-workflow)）。`npm run dev` 是另一条独立路径：它直接从 `web/src` 在 `3000` 端口提供页面，跳过上述流程以便快速迭代；相应地，它也绕过 Flask REST API 以及 rosbridge 通常基于 host 的连接逻辑。

**工作二：提供小型 REST API，与 rosbridge 无关。** Blocks 页面的 `Backend Programs`、`Named Locations`、`Run History` 和 `Voice Command` 面板会通过普通 HTTP JSON endpoints 工作：`/api/block-programs`、`/api/block-locations`、`/api/block-run-history`、`/api/voice-plan`。它们不使用 ROS topics 或 rosbridge。这与[课程 03](03-how-the-browser-talks-to-ros.md)介绍的通信路径不同：对应的 frontend 代码位于 `web/src/features/blocks/backendPrograms.js`、`backendLocations.js` 和 `backendRunHistory.js`，直接调用 `fetch()`，而不是 `window.ROSLIB`。这些面板的用途见[课程 09](09-blockly-programming.md)。

`flask_app.py` 同时也是 ROS node。`ParamFlask` class 声明了 `appAddress` 和 `portApp` 参数，由 launch file 从[`ros2/src/openamr_ui_package/param/config.yaml`](../../ros2/src/openamr_ui_package/param/config.yaml)读取。因此，即使 Flask 本身不处理 ROS messaging，它的 host 和 port 仍像其他节点的参数一样配置。

还有一个细节：如果 `~/.openamr_ui/certs/` 下存在 cert/key pair，`flask_app.py` 可以使用 HTTPS；如果证书缺失，则回退到普通 HTTP。这正是[Blockly 指南](../../web/src/features/blocks/README.md#voice-command-requirements)提到的 Voice Command “secure origin”要求的实现方式：浏览器不会允许网页从普通 HTTP LAN 地址访问 microphone，因此 HTTPS 是可选解决办法。

<a id="folders_handlerpy--the-node-behind-the-route-page"></a>
## folders_handler.py — the node behind the Route page

可执行入口是 `handler`，仅由可选辅助 launch [`physnode_launch.py`](../../ros2/src/openamr_ui_package/launch/physnode_launch.py)启动。class 内部默认 ROS node 名称是 `ui_folders`，但 `physnode_launch.py` 会将其覆盖为 `folders_handler`。节点运行时，在 `ros2 node list`/`ros2 node info` 中看到的就是后者。Route 页上的 `Save`、`Rename`、`Delete`、`Change` 或 `Create` 操作，实际由它读写 map/route files。

节点监听 `ui_operation` topic，但消息不是任意文本格式：第一个 `/` 之前是 command name（如 `save_route`、`change_map`、`delete_group`），之后是 JSON payload。`RoutePage.jsx` 会构造这些字符串，`folders_handler.py` 的 `ui_callback()` 根据 command name 分派到约 14 个 handler methods。

这是一种建立在普通 `std_msgs/String` topic 上的手写 RPC 风格模式，而不是 ROS service（见[课程 02](02-ros2-core-concepts.md)）。因此没有内置的 request/response 配对或错误报告机制；节点会把人类可读的状态字符串发布到 `ui_message`，前端只有 `Logs` 面板会显示这些内容。

每项 map/route 操作都会读取或更新 `param/current_map_route.yaml`，用于记录当前激活的 map 和 route。完整文件模型见[课程 08](08-map-and-route-model.md)。

除 route 文件的 CRUD 外，该节点还有 mapping mode 函数 `build_map_func` 和 `save_map_func`：它们会停止 AMCL/map_server/move_base 的 lifecycle nodes，并启动单独的 mapping launch file。Maps 页的 **Start mapping**/**Save current map** 按钮会触发这些函数（见[课程 06](06-the-pages.md#maps--mapspagejsx)）。这些功能曾经存在于节点中，但没有对应按钮；现在已接上线。

<a id="waypoint_navpy--a-second-subscriber-on-the-same-topic"></a>
## waypoint_nav.py — a second subscriber on the same topic

可执行入口是 `nav`，同样只由 `physnode_launch.py`启动。class 内部默认 ROS node 名称为 `Way_points_handler`，而 launch file 会覆盖为 `waypoint_nav`，与上面的 `folders_handler.py`相同。它是可选的 route-following helper：读取同一个 active route CSV，并通过 Nav2 的 `BasicNavigator`（`nav2_simple_commander`）逐点控制机器人，而不是像[课程 07](07-ui-components.md)介绍的那些面板一样发布到 `/goal_pose`。这是本代码库中第二种独立控制 Nav2 的方式；排查“机器人为什么开始移动”时要记得这一点。

需要留意的是，`waypoint_nav.py` 也订阅 `ui_operation`，但识别的是完全不同且不重叠的一组命令：`follow_route`、`next_point`、`previous_point`、`home`、`stop` 等普通字符串，不带 JSON payload。两个节点都会收到发布到 `ui_operation` 的每条消息，各自忽略无法识别的字符串。它们能安全共用一个 topic，是因为命令词汇不会冲突。新增 `ui_operation` command 时，请同时检查这两个文件。

## battery.py — no launch path exists yet

这个节点不只是默认关闭，目前也没有启动方式；除非自行编写 launch entry 或 `rclpy` script。`setup.py` 的 `console_scripts` 注册了 `flask`、`handler`、`nav`、`map_relay` 和 `nav_relay`，但没有注册 `battery.py` 的 `main()`，所以 `ros2 run openamr_ui_package battery` 不存在。文件末尾也没有 `if __name__ == "__main__":` guard，因此直接运行 `python3 battery.py` 也不会执行任何操作：`main()` 只定义了，从未被调用。

如果接入启动流程，它会从串口（`/dev/ttyUSB0`）读取电量并在 `battery_status` 发布 `Float32`。找不到串口设备时（不接真实电池机器人的常见情况），它会改用模拟电池，从 100 开始缓慢下降，让开发时 Status 页的 battery panel（见[课程 06](06-the-pages.md#status--infopagejsx)）有数据显示。这也解释了该页面“没有 battery data 只表示没有节点发布”的提示：目前所有 deployment 都是这种情况，因为尚无任何启动流程运行此节点。

## 试一试

查看 launch files，列出普通 UI 启动时会运行哪些节点，以及哪些节点需要 `physnode_launch.py`。然后找出 Flask 提供的已安装 React bundle 所在位置。

**完成标准：**能判断可选 map/route helpers 未运行时，哪些页面功能仍可使用。

## 下一课

[课程 06——所有页面导览](06-the-pages.md)回到 frontend，介绍每个页面的内容，以及它依赖的后端节点和 topics。

---

[← 课程 04](04-data-flow-and-relays.md) · [课程索引](README.md) · [下一课：课程 06 →](06-the-pages.md)
