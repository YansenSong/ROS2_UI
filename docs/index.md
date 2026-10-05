---
title: 首页
---

# OpenAMRobot UI 文档

OpenAMRobot UI 是一个浏览器控制台，用于查看和操作已在其他环境中运行的机器人，
提供地图、路线、手动驾驶、任务和诊断等功能，并通过 rosbridge 与 ROS 2 通信。
本网站是该项目的文档。源码位于
[github.com/YansenSong/ROS2_UI](https://github.com/YansenSong/ROS2_UI)，完整说明请从
[README](https://github.com/YansenSong/ROS2_UI/blob/main/README.md)开始阅读。

如果指南与当前代码不一致，以源码为准。部分较早的课程可能介绍已经变更的功能；
当前命令请以以下安装和开发指南为准。

部分课程链接到 `docs/` 目录之外的源码文件。这些链接在仓库页面中有效，但在已发布的
文档站点上可能无法解析。若源码链接无法打开，请到[仓库](https://github.com/YansenSong/ROS2_UI)
中查看对应文件。

## 开始使用

- [安装与启动指南](installation.md) — ROS 工作区构建、启动方式和端口。
- [开发指南](development.md) — Vite 开发、前端同步、ROS 构建、现有检查和源码位置。
- [故障排查指南](troubleshooting.md) — 按现象整理的排查表。

## 了解工作原理

课程按目录编号，首次阅读建议按顺序学习。每篇都注明适读对象、预计阅读时间和前置知识，
并直接链接到实际源码，避免复制容易过时的代码片段。

- [课程目录](lessons/README.md) — 完整课程列表，以及面向操作员、面板开发者等角色的精简阅读路径。
- [术语表](lessons/glossary.md) — 无需阅读整篇课程即可快速查询术语。

## 扩展系统

- [扩展指南](extending/README.md) — 按任务编写的实操指南，介绍如何添加 UI 面板、连接新设备，并提供完整示例。

## 架构概览

浏览器前端位于 `web/`；Flask API、rosbridge 启动配置和 ROS 侧中继节点位于 `ros2/src/`。
机器人驱动、Nav2、定位和仿真属于独立的 ROS 2 工作区。当前检出版本没有 Dockerfile、
Compose 配置或本地架构图。浏览器与 ROS 的连接方式请参阅
[课程 03](lessons/03-how-the-browser-talks-to-ros.md)。
