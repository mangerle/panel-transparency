import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class PanelTransparencyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.panel-transparency');

        // 创建首选项设置页
        const page = new Adw.PreferencesPage({
            title: '通用',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // 顶栏外观设置分组
        const appearanceGroup = new Adw.PreferencesGroup({
            title: '顶栏外观设置',
            description: '调整顶栏半透明效果及文字辨识度。',
        });
        page.add(appearanceGroup);

        // 顶栏不透明度滑动条
        const opacityRow = new Adw.ActionRow({
            title: '顶栏不透明度',
            subtitle: '拖动滑块调整透明度（0% 为全透明，100% 为完全不透明）',
        });

        const scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int('panel-opacity'),
            }),
            hexpand: true,
            draw_value: true,
            value_pos: Gtk.PositionType.RIGHT,
        });
        scale.set_size_request(220, -1);
        scale.add_mark(0, Gtk.PositionType.BOTTOM, '全透明');
        scale.add_mark(45, Gtk.PositionType.BOTTOM, '默认(45%)');
        scale.add_mark(100, Gtk.PositionType.BOTTOM, '不透明');

        scale.adjustment.connect('value-changed', () => {
            const val = Math.round(scale.adjustment.value);
            if (settings.get_int('panel-opacity') !== val) {
                settings.set_int('panel-opacity', val);
            }
        });
        opacityRow.add_suffix(scale);
        appearanceGroup.add(opacityRow);

        // 文字阴影增强开关
        const shadowRow = new Adw.SwitchRow({
            title: '增强文字阴影',
            subtitle: '为顶栏文字增加一层微弱黑色投影，在浅色壁纸下更加清晰易读',
            active: settings.get_boolean('text-shadow'),
        });
        shadowRow.connect('notify::active', () => {
            settings.set_boolean('text-shadow', shadowRow.active);
        });
        appearanceGroup.add(shadowRow);

        // 窗口聚焦与通知控制分组
        const focusGroup = new Adw.PreferencesGroup({
            title: '窗口聚焦与就绪通知',
            description: '配置当后台程序请求关注或调起新窗口时的前台置顶策略。',
        });
        page.add(focusGroup);

        // 窗口激活策略下拉选择行
        const activateRow = new Adw.ComboRow({
            title: '新窗口激活模式',
            subtitle: '浏览器打开下载目录或外部唤起应用时的置顶行为',
            model: new Gtk.StringList({
                strings: [
                    '自动置顶（推荐：新窗口直接弹到前台，忽略闪烁提醒）',
                    '全部置顶（所有提示均强制置顶）',
                    '仅静音（关闭已就绪通知，但保持在后台）',
                ],
            }),
        });

        const modeValues = ['open', 'all', 'none'];
        const currentMode = settings.get_string('activate-mode');
        const initialIndex = modeValues.indexOf(currentMode);
        activateRow.selected = initialIndex !== -1 ? initialIndex : 0;

        activateRow.connect('notify::selected', () => {
            const selectedMode = modeValues[activateRow.selected];
            if (selectedMode) {
                settings.set_string('activate-mode', selectedMode);
            }
        });

        focusGroup.add(activateRow);
    }
}
