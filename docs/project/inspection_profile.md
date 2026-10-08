# Inspection 配置状态

> 2026-10-07 更新：任务定义和执行由根工作区的 `ackermann_mission` 节点管理，
> Inspection 页面可在连接该节点后操作任务。定位、导航和实体安全的集成验证仍需单独完成。

使用 `REACT_APP_UI_PROFILE=inspection_demo` 构建，可显示精简后的 inspection 导航。这是编译期 UI 配置，
与 Config 中现有的 Demo Mode 开关无关。未设置该环境变量时，仍可使用现有 RobotPilot 导航和路线。

浏览器 UI 当前默认使用简体中文。页眉中的语言按钮可在中文、英文和德文之间切换。语言选择保存在
`robotpilotLangV2` 中；旧版语言默认值会重置一次，因此已有浏览器也会默认使用中文。核心导航和主要操作页面已本地化，
部分旧页面细节和 ROS 来源的消息仍为英文。

任务页面通过 `MissionClient` 与机器人侧 `ackermann_mission` 通信。任务定义、执行顺序和记录保存在机器人端；
旧浏览器草稿可从任务页导入。项目配置的地图导航控件、手动控制和 Software Stop 仍按原有限制禁用，
机器人导航/定位状态仍需独立核验。

任务接口已经接入，但完整 inspection 演示仍需核实
[`robot_interface_inventory.md`](robot_interface_inventory.md) 中的其他接口、Demo Mode fixture、重连行为，
以及自动和手动验证。请勿仅凭网页构建结果操作实体机器人。

## 验证范围限制

前端使用 Vite 和 Vitest，并支持 Node 24。2026-10-01，`npm ci` 成功，出现一条上游
`whatwg-encoding` 弃用提示；`npm test` 在 2 个文件中通过 4 项测试；默认配置和 `inspection_demo`
生产构建均成功。项目配置构建没有大代码块警告；旧版构建因可选 Blockly 编辑器仍保留一条警告。本地生产预览在未连接机器人的情况下
显示了中文项目导航和状态。本地 shell 没有 `ros2` 或 `colcon`，因此未检查 ROS 集成。对两个已修改中继文件运行
`python -m py_compile` 以及运行 `git diff --check` 均成功。这些检查不能证明运行时机器人行为或实体安全。
