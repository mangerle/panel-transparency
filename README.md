# Panel Transparency (顶栏透明度与焦点助手)

一款轻量、无模糊伪影的 GNOME Shell 扩展。

## 主要特性

1. **顶栏半透明与外观控制**：
   - 支持在图形设置界面自由调节顶栏不透明度（0% 全透明 至 100% 完全不透明，默认 45%）。
   - 保持 Ubuntu Yaru 主题原汁原味的 `#131313` 色相，避免深色色差。
   - 提供「文字阴影增强」开关，针对浅色壁纸有效防止文字发虚看不清。
2. **窗口智能聚焦与前台置顶**：
   - 彻底解决浏览器“在文件夹中打开”、外部链接唤起应用时新窗口留在后台、需要手动点击才翻到前台的问题。
   - 自动屏蔽「“xxx”已就绪」的无用就绪通知。
   - 默认采用「自动置顶」策略，只置顶真正的新窗口，忽略聊天软件的紧急闪烁，防止打字被打断。
3. **原生 Libadwaita 图形设置界面**：
   - 完美适配 GNOME 50，集成滑动条、阴影开关与下拉菜单。
   - 实时响应设置变化，无需重载扩展或重启系统。

## 安装与打包

### 手动打包
```bash
gnome-extensions pack -f --extra-source=stylesheet.css --schema=schemas/org.gnome.shell.extensions.panel-transparency.gschema.xml
```

### 安装到本地
```bash
gnome-extensions install -f panel-transparency@wangle.shell-extension.zip
gnome-extensions enable panel-transparency@wangle
```

## 协议
本项目遵循 GPL-2.0-or-later 许可协议。
