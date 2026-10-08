# 添加 Blockly block

本指南通过实操说明如何在 Blocks 页面添加新的 block。如果还没有阅读[课程 09——Blockly 可视化编程](../lessons/09-blockly-programming.md)，建议先阅读；该课程会介绍本指南涉及的 pipeline：block definition 转换成 action object，executor 再将该 action object 转为实际的 ROS publish 或 service call。添加 block 需要修改这三个阶段。

## 1. 定义 block

编辑[`web/src/features/blocks/blockDefinitions.js`](../../web/src/features/blocks/blockDefinitions.js)。添加 Blockly JSON block definition，也就是用户看到并拖入 workspace 的内容：

```js
{
  type: "robotpilot_beep",
  message0: "beep robot",
  previousStatement: null,
  nextStatement: null,
  colour: "#8b5cf6",
  tooltip: "Trigger a robot beep.",
}
```

接着在同一文件的 `blockToAction` 中添加对应 case，将已连接的 block 转换为 Generated Plan 中的普通 action object：

```js
case "robotpilot_beep":
  return { type: "beep" };
```

如果 block 包含 fields（数字、dropdown 等），按照 `blockToAction` 中相邻 case 的方式读取字段，并将它们加入返回的 action object。

## 2. 将 block 添加到 toolbox

编辑[`web/src/features/blocks/toolbox.js`](../../web/src/features/blocks/toolbox.js)，在对应类别下添加一项（Program、Navigation、Motion、Docking 或 Robot State，见[课程 09](../lessons/09-blockly-programming.md#block-categories-at-a-glance)）：

```js
{ kind: "block", type: "robotpilot_beep" }
```

如果没有这一步，block 虽然已经定义，但不会出现在左侧 sidebar 中。

## 3. 执行 action

编辑[`web/src/features/blocks/robotActions.js`](../../web/src/features/blocks/robotActions.js)，为第 1 步定义的 action `type` 添加对应 case：

```js
case "beep":
  // 按照此文件中相邻 case 的模式（例如 dockTopic.publish(...)），
  // 在这里向你的 topic 发布消息。
  return;
```

如果 action 需要新的 topic name，先将它加到[`web/src/shared/constants/index.js`](../../web/src/shared/constants/index.js)的 `AppConfig` 中，再从这里引用。不要 inline 写 topic string；这是所有面板都应遵守的规则，见[`docs/extending/add-a-ui-panel.md`](add-a-ui-panel.md#4-add-topic-names-to-the-constants-file--never-inline)。

如果机器人侧还没有对应 topic，或需要 relay，请先阅读[`docs/extending/connect-external-device.md`](connect-external-device.md)。

## 4. 确认实现

重新构建 frontend 并安装，确保 Flask 提供更新后的 bundle。与 `npm run dev` 不同，生产环境的 Flask server 不会对 Blockly code 执行 hot reload：

```bash
cd ~/robotpilot-ui
bash scripts/build_frontend.sh
bash scripts/sync_frontend_to_ros.sh
cd ros2
colcon build --packages-select robotpilot_ui_package
source install/setup.bash
```

重启 UI launch，强制刷新浏览器（`Ctrl+Shift+R`），打开 `/blocks`，确认新增 block 出现在正确类别中、可以连接到 `start robot program` 下方、能正确显示在 Generated Plan 中，并且页面显示 “Robot connected” 后，运行时确实会 publish。

Blocks 页的完整设置、构建模式说明和故障排查见[`web/src/features/blocks/README.md`](../../web/src/features/blocks/README.md)。
