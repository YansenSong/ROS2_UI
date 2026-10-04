# 课程 09——Blockly 可视化编程

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 操作员和 Blockly 贡献者 | 20 分钟 | [课程 00](00-your-first-10-minutes.md)及[课程 06](06-the-pages.md)中的 Programs 章节 |

## 学习目标

了解 blocks 如何转换为经过验证的机器人 actions、哪些 state 保存在浏览器或 backend，以及如何在避免不安全运动的情况下检查 plan。

[课程 06](06-the-pages.md#programs--blockspagejsx)概览了此页面（侧边栏名称为 “Programs”）。本课会深入介绍其用途、block 到机器人 action 的转换方式，以及 Voice Command 如何接入。所有 block 的详细说明、示例程序和设置/故障排查步骤见实操指南：[`web/src/features/blocks/README.md`](../../web/src/features/blocks/README.md)。本课解释设计原理，指南用于实际操作。

## Blockly 是什么

Blockly 是可视化编程编辑器：用户将 blocks 拖到 workspace 中并连接起来，不必编写代码。Blocks 页面（[`web/src/pages/BlocksPage.jsx`](../../web/src/pages/BlocksPage.jsx)）提供 OpenAMR 专用 blocks，例如 navigation、wait、drive 和 dock，让非程序员也能构建“去某处、等待、然后 dock”这样的机器人程序，无需编写 JavaScript 或手动发送 ROS messages。这与本 UI 的目标一致（[课程 01](01-what-is-this-ui.md)）：让用户通过友好界面完成原本需要手工发布 ROS messages 的操作。

## 页面布局

左侧 toolbox 按 `Program`、`Navigation`、`Motion`、`Docking` 和 `Robot State` 分类。中间 workspace 用于组合 blocks。右侧 panel 显示 connection status、Run/Stop buttons、Voice Command、program templates、run history、backend saved programs、named locations、plan checks，以及根据已连接 blocks 生成的 Generated Plan。

workspace 上方 toolbar 提供本地 program controls。`Save` 和 `Load` 使用浏览器存储；`Import` 和 `Export` 以 JSON 文件导入或导出 Blockly programs；`Reset` 会将 workspace 恢复为 starter program。

### Program Templates

`Program Templates` 提供现成示例，例如安全运动测试或低电量返航 routine。选中 template 后会显示简短说明；按 `Load Template` 会用其实际 Blockly blocks 替换当前 workspace。加载不会执行程序。按 `Run` 前应检查 blocks、Plan Checks 和 Generated Plan。

### Backend Programs

`Backend Programs` 通过 Flask backend 保存 Blockly workspaces（位于右侧 panel 更靠下的位置，在 Run History 后面）。输入 program name 并按 `Save` 保存；选择已有程序并按 `Load` 加载；按 `Delete` 删除选中的程序；`Refresh` 从 backend 重新加载列表。

此功能与 toolbar 的浏览器本地 `Save`/`Load` 不同：即使清除浏览器存储，backend programs 仍然保留；能访问同一 UI server 的其他浏览器也可以打开它们。

### Run History

每次 `Run` 都会记录在此处，无论程序是如何创建的。记录包含 name、result badge、timestamp、step count 和 duration。`Refresh` 重新加载列表；`Clear` 清空列表。无需打开 Events 或 Metrics 页面也能确认程序是否运行及运行时长。

### Named Locations

`Named Locations` 将易读名称（如 `Charging Station`）与 map pose（`x`、`y` 和 `yaw`）关联起来。这些记录会出现在 `navigate to location` block 中，避免程序重复填写坐标。`Save Location` 新增或更新记录；`Delete` 删除选中项；`Refresh` 从 backend 获取最新列表。若删除仍被程序引用的位置，Plan Checks 会标记该 plan。

Blockly program 应从 `start robot program` block 开始。机器人 actions 必须连接在该 start block 下方才能运行。实验时可以暂留未连接的 blocks，但 planner 只会读取 start block 下方的内容，因此未连接的 blocks 不会进入 Generated Plan。真实机器人测试时建议 workspace 只保留一个 start block，避免混淆。

Plan Checks panel 会在执行前报告安全和 validation warnings；Generated Plan panel 显示由已连接 blocks 构造的准确 step list。每个 step 的 status 初始为 `QUEUED`，运行时会更新。step count 和有序描述是 executor 即将执行内容的最终预览；如与预期不同，应先修改 blocks。

<a id="the-pipeline-block--action--execution--ros"></a>
## Pipeline：block → action → execution → ROS

每个 block——无论是手动拖入、从 template 加载，还是由语音命令生成——都会经过相同的四阶段 pipeline，之后才会向机器人发送内容：

```text
toolbox/workspace 中的 block
        |
        v
block definition（web/src/features/blocks/blockDefinitions.js）
        |
        v
Generated Plan 中的 action object（例如 "navigate"、"wait"、"dock"）
        |
        v
执行逻辑（web/src/features/blocks/robotActions.js）
        |
        v
通过共享 connection 调用 ROS topic 或 service（课程 10）
```

`blockDefinitions.js` 定义 block 的外观，并将连接起来的 blocks 转换为一组扁平的 action objects，即右侧 panel 中的 **Generated Plan**。`robotActions.js` 是唯一实际与 ROS 通信的位置：它按顺序处理 action list，并为每一步发布或调用对应的 topic/service。topic 名称沿用 UI 其他位置使用的 `AppConfig` constants（见[课程 10](10-topics-as-the-contract.md)），没有单独维护一套名称。

将“block 表达的含义”和“如何执行”分开后，手动创建的 block、保存的 template 和语音命令都能生成相同格式的 Generated Plan，并使用相同的执行路径。只有连接在唯一 `start robot program` block 下方的 blocks 会被读取；workspace 其他位置的游离 blocks 会被忽略。这也是实操指南中 “0 steps” 故障排查项的原因。

<a id="block-categories-at-a-glance"></a>
## Block 类别速览

toolbox（[`web/src/features/blocks/toolbox.js`](../../web/src/features/blocks/toolbox.js)）将 blocks 分为五类：

| 类别 | 用途 |
| --- | --- |
| **Program** | 程序结构：必需的 `start` block、`repeat` 和用于 debugging 的 `log`。本身不会驱动机器人。 |
| **Navigation** | Nav2 goals：坐标或 named-location goals、等待 navigation status、patrol loops。使用与 Map 页面相同的 `/goal_pose` 和 navigation-status 机制（[课程 06](06-the-pages.md#map--mappagejsx)）。 |
| **Motion** | 直接发送 `/cmd_vel` 命令：drive、rotate、stop、emergency stop。与 Navigation 不同，这些命令不会规划避障路径。 |
| **Docking** | 发布与 Map 页 `DockingControl` panel 相同的 dock/undock trigger topics（[课程 07](07-ui-components.md#dockingcontrol--dockingcontroljsx)）。 |
| **Robot State** | 读取 battery data 或发布 UI mode string；这是唯一会根据机器人状态分支、而非只发送命令的类别。 |

每个 block 的精确字段、截图和示例见实操指南的[类别参考](../../web/src/features/blocks/README.md#current-block-categories)。

<a id="plan-checks-one-safety-gate-regardless-of-origin"></a>
## Plan Checks：所有来源共用一个安全门

启用 `Run` 前，`planValidation.js` 会检查 Generated Plan，例如速度是否超过配置的限制、named location 是否仍存在等。页面还会在执行包含直接运动、docking 或 emergency stop 的计划前要求确认。所有计划都经过相同检查，无论 blocks 是手工拖入、template 加载还是 voice command 生成；没有跳过 validation 的“可信路径”。

<a id="voice-command"></a>
## Voice Command

`Voice Command` panel 是另一种**创建** plan 的方式。它仍然使用上文相同的 pipeline 和安全检查，只是在 pipeline 前面增加语音转 plan 步骤。

点击按钮，说出 wake word `Monsieur`，再说命令。panel 只有在听到 wake word 后才会显示识别文本。短暂停顿会结束录音并提交命令以生成 plan。

```text
用户说话
        |
        v
浏览器 Web Speech API 生成 transcript
        |
        v
去掉 wake word（"Monsieur"）及其之前的内容
        |
        v
POST /api/voice-plan（Flask backend，web/src/features/blocks/voicePlan.js）
        |
        v
Claude API 返回结构化 action plan
        |
        v
planToWorkspace()（blockDefinitions.js）将计划转换为实际 Blockly blocks
        |
        v
更新 workspace：使用相同的 Generated Plan、Plan Checks 和 Run button
```

有两点设计需要理解。Claude 只能输出现有 blocks 已定义的 action types：[`flask_app.py`](../../ros2/src/openamr_ui_package/openamr_ui_package/flask_app.py)中的 `/api/voice-plan` endpoint 会使用固定 schema 发起 tool call，并丢弃不匹配的内容，因此语音不能创造 executor 不认识的新 action。其次，Voice Command 只会**创建** blocks，不会自行运行；生成的 plan 仍需要手动按 `Run`，并通过与其他程序相同的 Plan Checks。

浏览器支持、secure-origin microphone 要求、API key、wake-word 行为和故障排查见实操指南中的[Voice Command 章节](../../web/src/features/blocks/README.md#voice-command)。

## 试一试

在 Demo Mode 中加载一个 template，查看其 Generated Plan 和 validation warnings，再运行并检查 run-history result。若要在真实硬件上测试，须先确认操作区域安全并准备好实体 emergency stop。

**完成标准：**能追踪一个 block 从 workspace 到 generated action 的过程，并指出它会使用哪个 topic、service 或 browser wait。

## 下一课

[课程 10——Topic 是接口契约](10-topics-as-the-contract.md)将从单个页面和 pipeline 转向整体设计，解释所有页面（包括 Blockly）使用的 topic *names* 为什么是 UI 与机器人之间的实际 interface。

---

[← 课程 08](08-map-and-route-model.md) · [课程索引](README.md) · [下一课：课程 10 →](10-topics-as-the-contract.md)
