# 完整示例：添加前向距离传感器

本示例从头到尾串联[`connect-external-device.md`](connect-external-device.md)和[`add-a-ui-panel.md`](add-a-ui-panel.md)，通过一个具体场景演示两份指南中的步骤如何配合，而不是将它们拆成两份互不相关的步骤列表。这是教学示例：以下代码目前并不存在于仓库中，是实际实现时需要编写的内容。

**场景：**机器人新增一个朝前安装的 ultrasonic range sensor。它的 driver 以每秒数 Hz 的频率，持续在 `/front_range` 发布 `sensor_msgs/Range`。我们希望在 Map 页面添加一个小面板，显示当前距离，并在障碍物过近时给出提示。

## 第 1 步——判断是否需要 relay

根据[课程 04](../lessons/04-data-flow-and-relays.md#the-problem-qos-not-code)中的方法检查：`/front_range` 是否为 latched（`TRANSIENT_LOCAL`），或是否可能在浏览器订阅前就已发布？range sensor driver 会持续发布，不需要让迟加入的 subscriber 读取“上一次的值”，所以它属于普通的 `VOLATILE` stream，与 `/odom` 或 `/scan_filtered` 类似，无需 relay，可直接接入 topic。

请使用 `ros2 topic info /front_range -v` 实际确认 QoS（参见[课程 12](../lessons/12-debugging-with-ros-cli.md)），不要只凭假设判断。

## 第 2 步——在 constants file 中添加 topic name

编辑[`web/src/shared/constants/index.js`](../../web/src/shared/constants/index.js)：

```js
export const AppConfig = {
  // ...existing keys
  FRONT_RANGE_TOPIC: "/front_range",
};
```

## 第 3 步——创建面板

新增 component `web/src/components/FrontRangeIndicator.jsx`，沿用[课程 07](../lessons/07-ui-components.md)中面板的通用模式：使用 `useRos()` 获取共享 connection；根据刚添加的 constant 创建 topic；在 `useEffect` 中订阅，并在 component 卸载时清理：

```jsx
import React, { useEffect, useRef, useState } from "react";
import { useRos } from "../app/App";
import { AppConfig } from "../shared/constants";

const CLOSE_THRESHOLD_M = 0.3;

const FrontRangeIndicator = () => {
  const ros = useRos();
  const [range, setRange] = useState(null);
  const topicRef = useRef(null);

  useEffect(() => {
    if (!ros || !window.ROSLIB) return;

    topicRef.current = new window.ROSLIB.Topic({
      ros,
      name: AppConfig.FRONT_RANGE_TOPIC,
      messageType: "sensor_msgs/Range",
    });

    topicRef.current.subscribe((msg) => {
      setRange(msg.range);
    });

    return () => topicRef.current?.unsubscribe();
  }, [ros]);

  const isClose = range !== null && range < CLOSE_THRESHOLD_M;

  return (
    <div className="rounded-xl border border-borderSubtle bg-bgCard px-4 py-2 font-[RobotoMono]">
      <p className="mb-1 text-xs uppercase tracking-wider text-themeTextGray">
        前向距离
      </p>
      <p className={`text-sm ${isClose ? "text-statusRed" : "text-textWhiteHover"}`}>
        {range === null ? "暂无数据" : `${range.toFixed(2)} m`}
        {isClose && " — 距离过近"}
      </p>
    </div>
  );
};

export default FrontRangeIndicator;
```

这与[`add-a-ui-panel.md`](add-a-ui-panel.md#3-reach-the-shared-ros-connection)中的基本模式一致。接线流程本身没有传感器专属逻辑；不同之处只有 topic name、message type，以及收到消息后如何处理。

## 第 4 步——在页面中渲染面板

将面板加入合适的页面。此例选择 Map 页面，因为距离信息与驾驶有关（见[课程 06](../lessons/06-the-pages.md#map--mappagejsx)）：

```jsx
// web/src/pages/MapPage.jsx
import FrontRangeIndicator from "../components/FrontRangeIndicator";
// ...
<FrontRangeIndicator />
```

这里不需要注册 route：这是已有页面中的一个 panel，并非新页面。因此[`add-a-ui-panel.md`](add-a-ui-panel.md#2-register-the-route-new-pages-only)第 2 步不适用。

## 第 5 步——验证

1. 确认机器人侧确实在发布：
   ```bash
   ros2 topic echo /front_range
   ```
2. 重新构建并安装 frontend，然后强制刷新浏览器。开发模式和生产构建的区别见[`add-a-ui-panel.md`第 5 步](add-a-ui-panel.md#5-confirm-it)。
3. 打开 Map 页面，确认面板显示实时数据；在传感器前方 0.3 m 内移动物体，读数应变为红色。

如果第 1 步能看到数据，但面板仍显示 “暂无数据”，问题在 frontend 一侧：constant 错误、message type 错误，或 component 没有实际渲染在页面中。通用排查方法见[课程 12](../lessons/12-debugging-with-ros-cli.md#a-decision-order-for-common-symptoms)。
