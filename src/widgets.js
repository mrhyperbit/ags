import Gtk from 'gi://Gtk?version=4.0';
import Widget from './widget.js';
import { typecheck, runCmd, restcheck, warning } from './utils.js';

function _orientation(str) {
    if (str === 'v')
        str = 'vertical';

    if (str === 'h')
        str = 'horizontal';

    try {
        return Gtk.Orientation[str.toUpperCase()];
    } catch (error) {
        warning('wrong orientation value');
    }

    return Gtk.Orientation.HORIZONTAL;
}

function removeBoxChildren(box) {
    let child = box.get_first_child();
    while (child) {
        box.remove(child);
        child = box.get_first_child();
    }
}

export function Box({ type,
    orientation = 'horizontal',
    homogeneous = false,
    children = [],
    ...rest
}) {
    typecheck('orientation', orientation, 'string', type);
    typecheck('homogeneous', homogeneous, 'boolean', type);
    typecheck('children', children, 'array', type);
    restcheck(rest, type);

    const box = new Gtk.Box({
        orientation: _orientation(orientation),
        homogeneous,
    });

    children.forEach(w => box.append(Widget(w)));
    box.removeChildren = () => removeBoxChildren(box);

    return box;
}

export function CenterBox({ type,
    startWidget,
    centerWidget,
    endWidget,
    orientation = 'horizontal',
    ...rest
}) {
    restcheck(rest, type);

    const box = new Gtk.CenterBox({
        orientation: _orientation(orientation),
        start_widget: Widget(startWidget),
        center_widget: Widget(centerWidget),
        end_widget: Widget(endWidget),
    });

    return box;
}

export function Icon({ type,
    iconName = '',
    icon,
    ...rest
}) {
    iconName = icon ? icon : iconName;
    typecheck('iconName', iconName, 'string', type);
    restcheck(rest, type);

    return Gtk.Image.new_from_icon_name(iconName);
}

export function Label({ type,
    label = '',
    markup = false,
    wrap = false,
    maxWidth = -1,
    justify = 'center',
    xalign = 0.5,
    yalign = 0.5,
    ...rest
}) {
    typecheck('label', label, 'string', type);
    typecheck('markup', markup || false, 'boolean', type);
    typecheck('wrap', wrap || false, 'boolean', type);
    typecheck('justify', justify || '', 'string', type);
    typecheck('xalign', xalign, 'number', type);
    typecheck('yalign', yalign, 'number', type);
    restcheck(rest, type);

    const lbl = new Gtk.Label({
        label,
        use_markup: markup,
        max_width_chars: maxWidth,
        wrap,
        xalign,
        yalign,
    });

    try {
        lbl.justify = Gtk.Justification[justify.toUpperCase()];
    } catch (error) {
        warning('wrong justify value');
    }

    return lbl;
}

export function Button({ type,
    child,
    onClick = '',
    ...rest
}) {
    typecheck('onClick', onClick, ['string', 'function'], type);
    restcheck(rest, type);

    const btn = new Gtk.Button();

    if (child)
        btn.set_child(Widget(child));

    btn.connect('clicked', () => runCmd(onClick, btn));

    return btn;
}

export function Slider({ type,
    inverted = false,
    orientation = 'horizontal',
    min = 0,
    max = 1,
    value = 0,
    onChange = '',
    drawValue = false,
    ...rest
}) {
    typecheck('inverted', inverted, 'boolean', type);
    typecheck('orientation', orientation, 'string', type);
    typecheck('min', min, 'number', type);
    typecheck('max', max, 'number', type);
    typecheck('onChange', onChange, ['string', 'function'], type);
    typecheck('value', value, 'number', type);
    typecheck('drawValue', drawValue, 'boolean', type);
    restcheck(rest, type);

    const slider = Widget({
        type: () => new Gtk.Scale({
            orientation: _orientation(orientation),
            adjustment: new Gtk.Adjustment({
                value: min,
                lower: min,
                upper: max,
                step_increment: (max - min) / 100,
            }),
            drawValue,
            inverted,
        }),
        onScroll: (slider, _dx, dy) => {
            const { adjustment } = slider;
            dy > 0
                ? adjustment.value -= adjustment.step_increment
                : adjustment.value += adjustment.step_increment;
        },
    });

    if (onChange) {
        slider.adjustment.connect('notify::value', ({ value }) => {
            typeof onChange === 'function'
                ? onChange(slider, value)
                : runCmd(onChange.replace(/\{\}/g, value));
        });
    }

    return slider;
}

export function Stack({ type,
    items = [],
    hhomogeneous = true,
    vhomogeneous = true,
    interpolateSize = false,
    transition = 'none',
    transitionDuration = 200,
    ...rest
}) {
    typecheck('hhomogeneous', hhomogeneous, 'boolean', type);
    typecheck('vhomogeneous', vhomogeneous, 'boolean', type);
    typecheck('interpolateSize', interpolateSize, 'boolean', type);
    typecheck('transition', transition, 'string', type);
    typecheck('transitionDuration', transitionDuration, 'number', type);
    typecheck('items', items, 'array', type);
    restcheck(rest, type);

    const stack = new Gtk.Stack({
        hhomogeneous,
        vhomogeneous,
        interpolateSize,
        transitionDuration,
    });

    try {
        stack.transitionType = Gtk.StackTransitionType[transition.toUpperCase()];
    } catch (error) {
        error('wrong interpolate value');
    }

    items.forEach(([name, widget]) => {
        if (widget)
            stack.add_named(Widget(widget), name);
    });

    stack.showChild = name => {
        const n = typeof name === 'function' ? name() : name;
        stack.visible = true;
        stack.get_child_by_name(n)
            ? stack.set_visible_child_name(n)
            : stack.visible = false;
    };
    return stack;
}

export function Entry({ type,
    text = '',
    placeholderText = '',
    visibility = true,
    onChange = '',
    onAccept = '',
    ...rest
}) {
    typecheck('text', text, 'string', type);
    typecheck('placeholderText', placeholderText, 'string', type);
    typecheck('onChange', onChange, ['string', 'function'], type);
    typecheck('onAccept', onAccept, ['string', 'function'], type);
    typecheck('visibility', visibility, 'boolean', type);
    restcheck(rest, type);

    const entry = new Gtk.Entry({
        placeholderText,
        visibility,
        text,
    });

    if (onAccept) {
        entry.connect('activate', ({ buffer }) => {
            typeof onAccept === 'function'
                ? onAccept(entry, buffer.text)
                : runCmd(onAccept.replace(/\{\}/g, buffer.text));
        });
    }

    if (onChange) {
        entry.buffer.connect('notify::text', ({ text }) => {
            typeof onAccept === 'function'
                ? onChange(entry, text)
                : runCmd(onChange.replace(/\{\}/g, text));
        });
    }

    return entry;
}

export function Scrollable({ type,
    child,
    hscroll = 'automatic',
    vscroll = 'automatic',
    ...rest
}) {
    typecheck('hscroll', hscroll, 'string', type);
    typecheck('vscroll', vscroll, 'string', type);
    restcheck(rest, type);

    const scrollable = new Gtk.ScrolledWindow({
        hadjustment: new Gtk.Adjustment(),
        vadjustment: new Gtk.Adjustment(),
    });

    try {
        scrollable.set_policy(
            Gtk.PolicyType[hscroll.toUpperCase()],
            Gtk.PolicyType[vscroll.toUpperCase()],
        );
    } catch (error) {
        error('wrong scroll policy');
    }

    if (child)
        scrollable.set_child(Widget(child));

    return scrollable;
}

export function Revealer({ type,
    transition = 'crossfade',
    transitionDuration = 250,
    duration,
    child,
    ...rest
}) {
    transitionDuration = duration ? duration : transitionDuration;
    typecheck('transition', transition, 'string', type);
    typecheck('transitionDuration', transitionDuration, 'number', type);
    restcheck(rest, type);

    const revealer = new Gtk.Revealer({
        transitionDuration,
    });

    try {
        revealer.transitionType = Gtk.RevealerTransitionType[transition.toUpperCase()];
    } catch (error) {
        error('wrong transition type');
    }

    if (child)
        revealer.set_child(Widget(child));

    return revealer;
}

export function Overlay({ type,
    overlays = [],
    child,
    ...rest
}) {
    typecheck('children', overlays, 'array', type);
    restcheck(rest, type);

    const overlay = new Gtk.Overlay();

    if (child)
        overlay.set_child(Widget(child));

    overlays.forEach(w => {
        const { measure, clip } = w;
        delete w.measure;
        delete w.clip;

        const widget = Widget(w);
        overlay.add_overlay(widget);

        if (typeof clip === 'boolean')
            overlay.set_clip_overlay(widget, clip);

        if (typeof measure === 'boolean')
            overlay.set_measure_overlay(widget, measure);
    });

    return overlay;
}

export function LevelBar({ type,
    value = 0,
    maxValue = 1,
    minValue = 0,
    inverted = false,
    orientation = 'horizontal',
    mode = 'continuous',
    ...rest
}) {
    typecheck('value', value, 'number', type);
    typecheck('maxValue', maxValue, 'number', type);
    typecheck('minValue', minValue, 'number', type);
    typecheck('inverted', inverted, 'boolean', type);
    typecheck('orientation', orientation, 'string', type);
    typecheck('mode', mode, 'string', type);
    restcheck(rest, type);

    const bar = new Gtk.LevelBar({
        orientation: _orientation(orientation),
        inverted,
        value, minValue, maxValue,
    });

    try {
        bar.set_mode(Gtk.LevelBarMode[mode.toUpperCase()]);
    } catch (error) {
        warning('wrong levelbar mode value');
    }

    return bar;
}

export function Switch({ type,
    active = false,
    onActivate = '',
    ...rest
}) {
    typecheck('active', active, 'boolean', type);
    typecheck('onActivate', onActivate, ['string', 'function'], type);
    restcheck(rest, type);

    const gtkswitch = new Gtk.Switch({ active });
    if (onActivate) {
        gtkswitch.connect('notify::active', ({ active }) => {
            typeof onActivate === 'function'
                ? onActivate(gtkswitch, active)
                : runCmd(onActivate.replace(/\{\}/g, active));
        });
    }

    return gtkswitch;
}

export function Popover({ type,
    child,
    autohide = true,
    hasArrow = false,
    ...rest
}) {
    typecheck('autohide', autohide, 'boolean', type);
    typecheck('hasArrow', hasArrow, 'boolean', type);
    restcheck(rest, type);

    const popover = new Gtk.Popover({
        autohide,
        hasArrow,
    });

    if (child)
        popover.set_child(Widget(child));

    return popover;
}

export function MenuButton({ type,
    child,
    popover,
    onActivate,
    ...rest
}) {
    restcheck(rest, type);

    const button = new Gtk.MenuButton({
        alwaysShowArrow: false,
    });

    if (onActivate)
        button.connect('notify::active', () => runCmd(onActivate, button));


    if (popover)
        button.set_popover(Widget(popover));

    if (child)
        button.set_child(Widget(child));

    return button;
}
