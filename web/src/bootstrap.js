// React DOM 18 的开发版会在模块加载时读取 navigator.userAgent.indexOf。
// 某些嵌入式浏览器没有提供 userAgent；先补齐，再加载应用入口。
if (typeof navigator.userAgent !== "string") {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "",
  });
}

import("./index.jsx");
