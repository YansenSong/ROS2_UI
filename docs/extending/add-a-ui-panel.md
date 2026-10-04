# 为 UI 添加面板或页面

本指南通过实操说明如何为 React app 添加新页面或独立 widget，同时不改变现有页面的行为。如果还没有阅读相关课程，请先看[课程 06](../lessons/06-the-pages.md)和[课程 10](../lessons/10-topics-as-the-contract.md)，了解本指南将逐步操作的模式。

## 1. 确定要添加页面还是面板

- **新面板/widget**（状态读数、控制项、小型图表），放在现有页面中 → 在[`web/src/components/`](../../web/src/components/)下添加 component，参考现有实现，例如[`web/src/components/NavStatus.jsx`](../../web/src/components/NavStatus.jsx)或[`web/src/components/SystemAlerts.jsx`](../../web/src/components/SystemAlerts.jsx)。然后在目标页面 component 中 import 并渲染它，例如[`web/src/pages/MapPage.jsx`](../../web/src/pages/MapPage.jsx)。完成下方第 3 步后即可，无需修改 routing。
- **完整的新页面**（拥有独立 URL 和导航项）→ 在[`web/src/pages/`](../../web/src/pages/)下添加 component，参考现有页面，例如[`web/src/pages/ConsolePage.jsx`](../../web/src/pages/ConsolePage.jsx)（这是最精简的页面）。然后继续第 2 步。

<a id="2-register-the-route-new-pages-only"></a>
## 2. 注册 route（仅新页面需要）

Routing 和 navigation 都读取同一个 array，因此只需修改一个文件：[`web/src/pages/registry.js`](../../web/src/pages/registry.js)。在 `PAGE_REGISTRY` 中添加一项：

```js
{ path: "/your-path", label: "Your Label", icon: "your-icon", component: YourPage },
```

[`web/src/pages/index.jsx`](../../web/src/pages/index.jsx)会将该 array 映射为 routes；[`web/src/components/Header.jsx`](../../web/src/components/Header.jsx)会将相同的 array 映射为桌面导航和移动端下拉菜单，两处都不需要单独修改。`icon` 必须与 `Header.jsx` 的 `NavIcon` 中某个 case 匹配。无法识别的名称只会回退为通用圆点，不会导致出错，所以可以先注册页面，再选择或添加 icon。

如果希望将页面作为独立 plugin 提供，而不直接修改 core registry（例如不希望页面合并到仓库的 `pages/` 目录），可以在自己的 module 中调用同一 `registry.js` 导出的 `registerPage(entry)`，而不是手动向 `PAGE_REGISTRY` 添加内容。完整可运行的示例见[`web/src/plugins/notesPlugin/`](../../web/src/plugins/notesPlugin/)：其 `index.js` 包含全部集成逻辑，并由[`web/src/index.js`](../../web/src/index.js)通过一次函数调用安装。

<a id="3-reach-the-shared-ros-connection"></a>
## 3. 使用共享 ROS connection

所有页面和面板都通过两个 hooks 使用整个 app 共用的**唯一一个** ROS connection。该 connection 在[`web/src/app/App.jsx`](../../web/src/app/App.jsx)中创建一次；同一文件还导出：

- `useRos()`——返回共享的 `ROSLIB.Ros` instance；app 尚未创建 connection 时返回 `null`。
- `useRosStatus()`——返回当前 connection 状态字符串（`"connected"` | `"disconnected"` | `"error"`），可用于显示连接/离线状态，而不必自行设置 listener。

面板不会自行创建 `ROSLIB.Ros()` connection。标准实现方式如下，可参考任一现有 component：

```jsx
import { useEffect, useRef } from "react";
import { useRos } from "../app/App";
import { AppConfig } from "../shared/constants";

const YourPanel = () => {
  const ros = useRos();
  const topicRef = useRef(null);

  useEffect(() => {
    if (!ros || !window.ROSLIB) return;

    topicRef.current = new window.ROSLIB.Topic({
      ros,
      name: AppConfig.YOUR_TOPIC,
      messageType: "std_msgs/String",
    });

    topicRef.current.subscribe((msg) => {
      // 在此处理 msg
    });

    return () => topicRef.current?.unsubscribe();
  }, [ros]);

  // ...使用 subscription 更新的 state 渲染界面
};
```

如果要发布而不是订阅，可在 event handler 中调用 `topicRef.current.publish(new window.ROSLIB.Message({ ... }))`。最精简的只发布示例见[`web/src/components/Joystick.jsx`](../../web/src/components/Joystick.jsx)。如果需要 request/response 调用而不是 topic，请参考[`web/src/components/LifecycleStatus.jsx`](../../web/src/components/LifecycleStatus.jsx)中的 `ROSLIB.Service` 示例。

面板只应声明实际需要的 topics；不要访问其他面板的 subscriptions，也不要“以防万一”订阅额外内容。这样每个面板都能独立管理，也更容易在之后删除或迁移。

<a id="4-add-topic-names-to-the-constants-file--never-inline"></a>
## 4. 在 constants file 中添加 topic names，不要写 inline string

所有 topic、service 和 action names 都应加入[`web/src/shared/constants/index.js`](../../web/src/shared/constants/index.js)，作为导出的 `AppConfig` object 中的新 key。对于 camera options 或 lifecycle node names 等相关值较多的情况，也可以单独导出一个有名称的常量；可参考同一文件中的 `CAMERA_TOPIC_OPTIONS` 和 `LIFECYCLE_NODES`。从该文件 import 名称；不要在 component 内直接写 topic string。这样该文件就能作为查看“UI 依赖哪些内容”的唯一入口。详见[课程 10](../lessons/10-topics-as-the-contract.md)。

如果机器人侧还没有对应 topic，或者需要先调整 QoS 才能让 browser client 稳定接收，请先阅读[`connect-external-device.md`](connect-external-device.md)。

<a id="5-confirm-it"></a>
## 5. 确认实现

运行 frontend dev server，检查新页面/面板能否渲染；rosbridge 可连接后，确认 subscription 或 publish 行为符合预期：

```bash
cd web
npm install
npm run dev
```

完整的 build/deploy 步骤见主 [README](../../README.md)。
