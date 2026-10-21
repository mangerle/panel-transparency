// 这个扩展干两件事：
//
//   1. 顶栏半透明 —— 全部在 stylesheet.css 里，GNOME Shell 会自动加载，无代码
//   2. 关掉「“xxx”已就绪」通知 —— 本文件下面这些 JS
//
// 第 2 件事的实现方式值得说明，因为它和网上常见的写法不一样。
//
// 常见写法（NoAnnoyance 那一派）是覆盖 Main.windowAttentionHandler
// ._onWindowDemandsAttention，但**在本版本上无效**。看 GNOME 50 的源码
// （/usr/lib/gnome-shell/libshell-18.so 里的 ui/windowAttentionHandler.js）：
//
//     global.display.connectObject(
//         'window-demands-attention', this._onWindowDemandsAttention.bind(this),
//         'window-marked-urgent',    this._onWindowDemandsAttention.bind(this), this);
//
// 构造函数里就 .bind(this) 了，信号在那一刻已经抓住原方法的引用；而扩展加载
// 发生在 shell 初始化之后，此时再改那个属性，连接里那个闭包指向的还是老函数。
//
// 所以这里改成直接断开 shell 自己接的那两条信号（disconnectObject 会一次性
// 摘掉用同一个跟踪对象建立的全部连接），disable() 时再按原来的形状接回去。

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const DEMANDS_ATTENTION = 'window-demands-attention';
const MARKED_URGENT = 'window-marked-urgent';

// 静音之后，要不要顺便把请求注意力的窗口提到前台。
//
//   'none'  只静音，不碰焦点（默认）
//   'open'  新窗口请求注意力时直接把它激活，但忽略 window-marked-urgent
//   'all'   两种信号都激活（NoAnnoyance 的老行为）
//
// 默认给 'none' 是有意的：shell 把这两种信号接到同一个处理函数上，
// 而 window-marked-urgent 是聊天类应用「闪一下」用的，把这种也提到前台
// 会变成打字打到一半被抢走焦点。要开就建议只开 'open'。
export default class PanelTransparencyExtension extends Extension {
    enable() {
        this._handler = Main.windowAttentionHandler ?? null;
        this._extraConnections = [];
        this._settings = this.getSettings('org.gnome.shell.extensions.panel-transparency');

        // 拿不到就先不动。宁可这个功能不生效，也不能抛异常 ——
        // enable() 抛了会让整个扩展加载失败，连 stylesheet.css 一起挂掉。
        if (!this._handler) {
            console.warn('panel-transparency: 找不到 windowAttentionHandler，已就绪通知保持原样');
            return;
        }

        global.display.disconnectObject(this._handler);

        this._updateSignalConnections();

        // 监听设置变更，实时切换模式无需重载扩展
        this._settingsChangedId = this._settings.connect('changed::activate-mode', () => {
            this._updateSignalConnections();
        });

        // 动态加载并监听外观样式变化（透明度与文字投影）
        this._applyStyles();
        this._opacityChangedId = this._settings.connect('changed::panel-opacity', () => {
            this._applyStyles();
        });
        this._shadowChangedId = this._settings.connect('changed::text-shadow', () => {
            this._applyStyles();
        });
    }

    _applyStyles() {
        const opacity = this._settings?.get_int('panel-opacity') ?? 45;
        const shadow = this._settings?.get_boolean('text-shadow') ?? false;

        // 动态切换顶栏不透明度样式类
        if (this._currentOpacityClass) {
            Main.panel.remove_style_class_name(this._currentOpacityClass);
        }
        this._currentOpacityClass = `panel-opacity-${opacity}`;
        Main.panel.add_style_class_name(this._currentOpacityClass);

        // 动态切换文字阴影增强类
        if (shadow) {
            Main.panel.add_style_class_name('panel-text-shadow');
        } else {
            Main.panel.remove_style_class_name('panel-text-shadow');
        }
    }

    _updateSignalConnections() {
        // 清理已有的自定义信号连接
        for (const id of this._extraConnections ?? [])
            global.display.disconnect(id);
        this._extraConnections = [];

        const activateMode = this._settings?.get_string('activate-mode') ?? 'open';
        const signals = activateMode === 'all'
            ? [DEMANDS_ATTENTION, MARKED_URGENT]
            : activateMode === 'open'
                ? [DEMANDS_ATTENTION]
                : [];

        for (const signal of signals) {
            this._extraConnections.push(
                global.display.connect(signal, (_display, window) => this._activate(window)));
        }
    }

    disable() {
        if (this._settingsChangedId) {
            this._settings?.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        if (this._opacityChangedId) {
            this._settings?.disconnect(this._opacityChangedId);
            this._opacityChangedId = null;
        }
        if (this._shadowChangedId) {
            this._settings?.disconnect(this._shadowChangedId);
            this._shadowChangedId = null;
        }
        this._settings = null;

        // 清除动态附加的顶栏外观样式类
        if (this._currentOpacityClass) {
            Main.panel.remove_style_class_name(this._currentOpacityClass);
            this._currentOpacityClass = null;
        }
        Main.panel.remove_style_class_name('panel-text-shadow');

        for (const id of this._extraConnections ?? [])
            global.display.disconnect(id);
        this._extraConnections = [];

        // 把 shell 原本的行为接回去：同一个方法、同一个跟踪对象，
        // 这样才能保证别人之后再 disconnectObject(handler) 依然摘得干净。
        if (this._handler) {
            global.display.connectObject(
                DEMANDS_ATTENTION, this._handler._onWindowDemandsAttention.bind(this._handler),
                MARKED_URGENT, this._handler._onWindowDemandsAttention.bind(this._handler),
                this._handler);
        }

        this._handler = null;
    }

    _activate(window) {
        // 沿用 shell 自己那三条豁免条件，别对已获焦点的窗口或托盘窗口下手
        if (!window || window.has_focus() || window.is_skip_taskbar())
            return;

        Main.activateWindow(window);
    }
}
