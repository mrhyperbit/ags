import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';
import Widget from './widget.js';
import { restcheck, typecheck, warning } from './utils.js';
import { setStyle, toggleClassName } from './widget.js';

const { Gtk4LayerShell: GtkLayerShell } = imports.gi;

export interface Window {
    anchor?: string
    child?: { type: string } | Gtk.Widget | null
    className?: string
    exclusive?: boolean
    focusable?: boolean
    layer?: string
    margin?: number[] | number
    monitor?: number
    name?: string
    style?: string
    visible?: boolean
    setup?: (win: Gtk.Window) => void,
    dialog?: boolean,
}

export default function Window({
    name = 'gtk-layer-shell',
    anchor = '',
    margin = [],
    layer = 'top',
    exclusive = false,
    focusable = false,
    child = null,
    className = '',
    style = '',
    monitor,
    visible = true,
    dialog = false,
    setup,
    ...rest
}: Window): Gtk.Window {
    typecheck('name', name, 'string', 'window');
    typecheck('anchor', anchor, 'string', 'window');
    typecheck('margin', margin, ['number', 'array'], 'window');
    typecheck('layer', layer, 'string', 'window');
    typecheck('exclusive', exclusive, 'boolean', 'window');
    typecheck('focusable', focusable, 'boolean', 'window');
    typecheck('className', className, 'string', 'window');
    typecheck('monitor', monitor, ['number', 'undefined'], 'window');
    restcheck(rest, `window: ${name}`);

    const win = dialog
        ? new Gtk.Dialog({ name })
        : new Gtk.Window({ name });

    win.set_default_size(1, 1);
    GtkLayerShell.init_for_window(win);
    GtkLayerShell.set_namespace(win, name);

    // @ts-ignore
    win.setStyle = (css: string) => setStyle(win, css);

    // @ts-ignore
    win.toggleClassName = (className: string, condition) => toggleClassName(win, className, condition);

    if (anchor) {
        anchor.trim().split(' ').forEach(side => {
            try {
                GtkLayerShell.set_anchor(
                    win,
                    GtkLayerShell.Edge[side.toUpperCase()],
                    true,
                );
            } catch (error) {
                warning('wrong anchor value');
            }
        });
    }

    if (margin) {
        let margins: [side: string, index: number][] = [];
        if (typeof margin === 'number')
            margin = [margin];

        switch (margin.length) {
        case 1:
            margins = [['TOP', 0], ['RIGHT', 0], ['BOTTOM', 0], ['LEFT', 0]];
            break;
        case 2:
            margins = [['TOP', 0], ['RIGHT', 1], ['BOTTOM', 0], ['LEFT', 1]];
            break;
        case 3:
            margins = [['TOP', 0], ['RIGHT', 1], ['BOTTOM', 2], ['LEFT', 1]];
            break;
        case 4:
            margins = [['TOP', 0], ['RIGHT', 1], ['BOTTOM', 2], ['LEFT', 3]];
            break;
        default:
            break;
        }

        margins.forEach(([side, i]) =>
            GtkLayerShell.set_margin(win, GtkLayerShell.Edge[side], (margin as number[])[i]),
        );
    }

    GtkLayerShell.set_layer(win, GtkLayerShell.Layer[layer?.toUpperCase()]);

    if (exclusive)
        GtkLayerShell.auto_exclusive_zone_enable(win);

    if (typeof monitor === 'number') {
        const display = Gdk.Display.get_default();
        const mon = display?.get_monitors().get_item(monitor);
        mon
            ? GtkLayerShell.set_monitor(win, mon)
            : warning(`Coulnd not find monitor with id ${monitor}`);
    }

    if (typeof className === 'string') {
        className.split(' ').forEach(cn => {
            if (cn)
                win.add_css_class(cn);
        });
    }

    if (style)
        setStyle(win, style);

    if (child)
        win.set_child(Widget(child));

    if (focusable)
        GtkLayerShell.set_keyboard_mode(win, GtkLayerShell.KeyboardMode.ON_DEMAND);

    visible ? win.present() : win.visible = false;

    if (setup)
        setup(win);

    return win;
}
