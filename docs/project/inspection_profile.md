# Inspection 配置状态

使用 `REACT_APP_UI_PROFILE=inspection_demo` 构建，可显示精简后的 inspection 导航。这是编译期 UI 配置，
与 Config 中现有的 Demo Mode 开关无关。未设置该环境变量时，仍可使用现有 OpenAMRobot 导航和路线。

浏览器 UI 当前默认使用简体中文。页眉中的语言按钮可在中文、英文和德文之间切换。语言选择保存在
`openamrLangV2` 中；旧版语言默认值会重置一次，因此已有浏览器也会默认使用中文。核心导航和主要操作页面已本地化，
部分旧页面细节和 ROS 来源的消息仍为英文。

项目配置目前只显示已保存的任务草稿，**无法运行任务**。仓库中只有浏览器端 `MissionRunner` 和基于 Nav2
`BasicNavigator` 的 waypoint 实现。两者都不是针对提议中的 LIO-SAM / NDT / Hybrid A* / NeuPAN 软件栈
经过验证的机器人侧执行器。项目配置没有挂载浏览器端 runner，其中的导航控件、未经验证的手动控制和 Software Stop
均已禁用。机器人导航/定位状态明确标记为 UNKNOWN。

这是尚未完成的适配，不能作为可部署的 inspection 演示。剩余工作需要先提供并接受
[`robot_interface_inventory.md`](robot_interface_inventory.md) 中列出的机器人侧接口，再完成任务持久化/传输、机器人侧执行、
Demo Mode fixture、重连行为，以及自动和手动验证。请勿使用此配置操作实体机器人。

## 验证范围限制

前端使用 Vite 和 Vitest，并支持 Node 24。2026-10-01，`npm ci` 成功，出现一条上游
`whatwg-encoding` 弃用提示；`npm test` 在 2 个文件中通过 4 项测试；默认配置和 `inspection_demo`
生产构建均成功。项目配置构建没有大代码块警告；旧版构建因可选 Blockly 编辑器仍保留一条警告。本地生产预览在未连接机器人的情况下
显示了中文项目导航和状态。本地 shell 没有 `ros2` 或 `colcon`，因此未检查 ROS 集成。对两个已修改中继文件运行
`python -m py_compile` 以及运行 `git diff --check` 均成功。这些检查不能证明运行时机器人行为或实体安全。
