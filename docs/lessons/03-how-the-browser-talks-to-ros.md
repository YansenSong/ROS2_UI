# 课程 03——浏览器如何与 ROS 通信

| 适读对象 | 阅读时间 | 前置知识 |
| --- | --- | --- |
| 操作员和开发者 | 12 分钟 | [课程 02](02-ros2-core-concepts.md) |

## 学习目标

了解 Flask、roslibjs、rosbridge 和 web_video_server 如何构成三条彼此独立的浏览器通信链路。

浏览器标签页不能直接使用 ROS 2 的原生中间件协议。本 UI 通过一条固定链路弥补这一差异。理解各环节很有用：界面没有显示某项内容时，通常要检查链路中的哪一环出了问题，而不是先认定 React 代码有误。

## 通信链路

```text
浏览器中的 React 应用
        |
        v
roslibjs（通过普通 <script> 标签加载的 JavaScript 库）
        |
        v
WebSocket 连接（长期保持的双向连接；与普通 HTTP 请求不同，任一端都可以随时发送消息）
        |
        v
rosbridge_server（ROS 2 节点：rosbridge_websocket）
        |
        v
ROS 2 graph（机器人/仿真一侧的 topics、services 和 actions）
```

再向两侧各延伸一层，可以看到 UI 一侧的 relay 节点（见[课程 04](04-data-flow-and-relays.md)）以及另一侧的机器人/仿真工作区（见[课程 01 的双工作区模型](01-what-is-this-ui.md#the-two-workspace-model)）：

```text
浏览器标签页                   本 UI 工作区                   机器人/仿真工作区
------------                   ------------                   ----------------
React 应用
  |
  v
roslibjs  <---- WebSocket ----> rosbridge_websocket
                                      |
                                      v
                                map_relay / nav_relays  <---- topics ----> Nav2、AMCL、map_server、
                                （为迟加入的浏览器                         drivers、sensors……
                                  重新发布消息）
```

`roslibjs` 不通过 npm 安装，而是作为浏览器脚本直接加载，位置在 [`web/index.html`](../../web/index.html)，与 `ros2d.js`、`nav2d.js`、`easeljs.js` 和 `eventemitter2.min.js` 一起引入。这些辅助库用于地图渲染。加载后，`roslibjs` 可通过全局对象 `window.ROSLIB` 使用。

<a id="where-the-connection-is-opened"></a>
## 连接在哪里建立

整个应用只创建一个 `ROSLIB.Ros()` 连接，创建位置是 [`web/src/app/App.jsx`](../../web/src/app/App.jsx)。它会根据页面自身的 URL 确定 rosbridge 主机；只有通过 `localhost:3000` 运行 React 开发服务器时，才会回退到配置的 IP。连接会跟踪已连接、断开和错误状态。

连接对象及状态通过 **React context** 向下传递。React context 可以让组件树中较上层的组件提供一个值，供下层组件读取，而不必逐层通过 props 转交。因此，各页面和面板共用同一个连接，不会各自新建连接。面板如何使用连接，见[课程 10](10-topics-as-the-contract.md)和[`docs/extending/add-a-ui-panel.md`](../extending/add-a-ui-panel.md)。

连接建立后，页面或组件会创建绑定到该共享连接的 `ROSLIB.Topic`（也可能是 `Service` 或 action 相关 topic），然后调用 `.publish()` 发布消息，或调用 `.subscribe()` 接收消息。这与[课程 02](02-ros2-core-concepts.md)介绍的 publish/subscribe 模型相同；roslibjs 是 JavaScript 侧的客户端。例如，在 Send Goal 模式下点击地图时，Map 页面会根据点击坐标构造符合 `geometry_msgs/PoseStamped` 的消息，并发布到 `/goal_pose`。roslibjs 将消息转换成 JSON 后通过 WebSocket 发送；rosbridge 再将它还原成 ROS 2 消息并发布到真正的 `/goal_pose` topic，效果与原生 ROS 2 节点发布相同。

## Flask 的独立职责：提供网页

开始 ROS 通信前，浏览器必须先通过普通 HTTP 加载 React 应用的 HTML、JS 和 CSS。这项工作由 Flask 节点完成：[`ros2/src/openamr_ui_package/openamr_ui_package/flask_app.py`](../../ros2/src/openamr_ui_package/openamr_ui_package/flask_app.py)。它负责提供编译后的 React build，以及少量 HTTP API（Blockly 页面的语音命令功能会用到）。Flask 负责把网页送到浏览器；网页加载后，rosbridge 才负责让它与 ROS 通信。两者是不同的服务器，使用不同端口。

<a id="the-camera-stream-is-a-third-separate-path"></a>
## Camera stream 使用第三条独立链路

Camera images **不会**经过 rosbridge/roslibjs。若把图像数据与其他内容放在同一个 WebSocket 中传输，速度会很慢且开销很大。因此，`web_video_server` 会把 ROS image topics 暴露为普通 MJPEG HTTP stream。Camera 面板会创建指向该服务器的 `<img>` URL，见[`web/src/components/Camera.jsx`](../../web/src/components/Camera.jsx)。所以 camera topic 名称和 camera HTTP port 与 rosbridge 的 topic 常量分开配置，见 [`CAMERA_PORT` 和 `CAMERA_TOPIC_OPTIONS`](../../web/src/shared/constants/index.js)。

## 三条独立连接小结

| 连接 | 协议 | 用途 | 默认端口 |
| --- | --- | --- | --- |
| Flask | HTTP | 提供编译后的 React 应用和少量 HTTP API | `5050` |
| rosbridge | WebSocket | 浏览器向 ROS 发布/订阅消息及调用 service | `9090` |
| web_video_server | HTTP | Camera image stream（MJPEG） | `8080` |

如果网页能打开但内容不更新，先检查 rosbridge；如果网页完全打不开，先检查 Flask；如果其他功能正常但 camera 没画面，检查 `web_video_server` 或所选 image topic。具体排查步骤见主 [README](../../README.md#troubleshooting)。

## 试一试

打开 UI，分别找出 HTTP 网页 URL、WebSocket rosbridge 地址和 camera HTTP port。设想其中一条链路中断时，哪些可见功能会失效。

**完成标准：**能解释为什么网页加载成功时 ROS data 仍可能断开，也能解释 ROS data 正常但 camera 仍可能没有画面。

## 下一课

[课程 04——数据流与 relay 节点](04-data-flow-and-relays.md)会解释为什么部分机器人侧 topics 会在浏览器接收前，以 `/ui/*` 名称重新发布。

---

[← 课程 02](02-ros2-core-concepts.md) · [课程索引](README.md) · [下一课：课程 04 →](04-data-flow-and-relays.md)
