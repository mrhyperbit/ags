import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';
import { typecheck, error, warning, interval } from './utils.js';
import * as Basic from './widgets.js';

interface ServiceAPI {
    instance: {
        connectWidget: (widget: Gtk.Widget, callback: (widget: Gtk.Widget, ...args: any[]) => void, event?: string) => void
    }
}

interface EventListeners {
    onFocusEnter?: (widget: Gtk.Widget) => void,
    onFocusLeave?: (widget: Gtk.Widget) => void,
    onKeyPressed?: (widget: Gtk.Widget, keyval: number, keycode: number, state: Gdk.ModifierType) => void,
    onKeyReleased?: (widget: Gtk.Widget, keyval: number, keycode: number, state: Gdk.ModifierType) => void,
    onMotion?: (widget: Gtk.Widget, x: number, y: number) => void,
    onHoverEnter?: (widget: Gtk.Widget, x: number, y: number) => void,
    onHoverLeave?: (widget: Gtk.Widget) => void,
    onScroll?: (widget: Gtk.Widget, dx: number, dy: number) => void,
    onScrollUp?: (widget: Gtk.Widget) => void,
    onScrollDown?: (widget: Gtk.Widget) => void,
    onButtonPressed?: (widget: Gtk.Widget, button: number) => void,
    onButtonReleased?: (widget: Gtk.Widget, button: number) => void,
}

interface WidgetProps {
    type: string | (() => Gtk.Widget)
    className?: string
    style?: string
    halign?: 'start' | 'center' | 'end' | 'fill'
    valign?: 'start' | 'center' | 'end' | 'fill'
    hexpand?: boolean
    vexpand?: boolean
    sensitive?: boolean
    tooltip?: string
    visible?: boolean
    connections?: ([string, (...args: any[]) => any] | [number, (...args: any[]) => any] | [ServiceAPI, (...args: any[]) => any, string])[]
    properties?: [any, any][]
    setup?: (widget: Gtk.Widget) => void
}

type Widget = WidgetProps & EventListeners;

const widgets: { [key: string]: (props: any) => Gtk.Widget } = {
    'box': Basic.Box,
    'button': Basic.Button,
    'centerbox': Basic.CenterBox,
    'entry': Basic.Entry,
    'icon': Basic.Icon,
    'label': Basic.Label,
    'overlay': Basic.Overlay,
    'progressbar': Basic.ProgressBar,
    'revealer': Basic.Revealer,
    'scrollable': Basic.Scrollable,
    'slider': Basic.Slider,
    'stack': Basic.Stack,
    'switch': Basic.Switch,
};

export function setStyle(widget: Gtk.Widget, css: string) {
    const provider = new Gtk.CssProvider();
    const style = `* { ${css} }`;
    provider.load_from_data(style, style.length);
    widget.get_style_context().add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_USER);
}

export function toggleClassName(widget: Gtk.Widget, className: string, condition = true) {
    condition
        ? widget.add_css_class(className)
        : widget.remove_css_class(className);
}

function handleEvent(callback: (...args: any[]) => void | boolean, ...args: any[]) {
    const r = callback(...args);
    if (typeof r === 'boolean')
        return r;

    return true;
}

function parseEventListeners(widget: Gtk.Widget, {
    onFocusEnter, onFocusLeave,
    onKeyPressed, onKeyReleased,
    onMotion, onHoverEnter, onHoverLeave,
    onScroll, onScrollUp, onScrollDown,
    onButtonPressed, onButtonReleased,
}: EventListeners) {
    if (onFocusLeave || onFocusEnter) {
        const controller = new Gtk.EventControllerFocus();
        widget.add_controller(controller);

        if (onFocusEnter) {
            controller.connect('enter', () =>
                handleEvent(onFocusEnter, widget),
            );
        }

        if (onFocusLeave) {
            controller.connect('leave', () =>
                handleEvent(onFocusLeave, widget),
            );
        }
    }

    if (onKeyReleased || onKeyPressed) {
        const controller = new Gtk.EventControllerKey();
        widget.add_controller(controller);

        if (onKeyPressed) {
            controller.connect('key-pressed', (_s, val, code, state) =>
                handleEvent(onKeyPressed, widget, val, code, state),
            );
        }

        if (onKeyReleased) {
            controller.connect('key-released', (_s, val, code, state) =>
                handleEvent(onKeyReleased, widget, val, code, state),
            );
        }
    }

    if (onMotion || onHoverLeave || onHoverEnter) {
        const controller = new Gtk.EventControllerMotion();
        widget.add_controller(controller);

        if (onMotion) {
            controller.connect('motion', (_s, x, y) =>
                handleEvent(onMotion, widget, x, y),
            );
        }

        if (onHoverLeave) {
            controller.connect('leave', () =>
                handleEvent(onHoverLeave, widget),
            );
        }

        if (onHoverEnter) {
            controller.connect('enter', (_s, x, y) =>
                handleEvent(onHoverEnter, widget, x, y),
            );
        }
    }

    if (onScroll || onScrollUp || onScrollDown) {
        const controller = new Gtk.EventControllerScroll();
        widget.add_controller(controller);
        controller.set_flags(Gtk.EventControllerScrollFlags.BOTH_AXES);

        if (onScroll) {
            controller.connect('scroll', (_s, dx, dy) =>
                handleEvent(onScroll, widget, dx, dy),
            );
        }

        if (onScrollUp) {
            controller.connect('scroll', (_s, dx, dy) => {
                if (dy < 0 || dx < 0)
                    return handleEvent(onScrollUp, widget, dx, dy);

                return false;
            });
        }

        if (onScrollDown) {
            controller.connect('scroll', (_s, dx, dy) => {
                if (dy > 0 || dx > 0)
                    return handleEvent(onScrollDown, widget, dx, dy);

                return false;
            });
        }
    }

    if (onButtonPressed || onButtonReleased) {
        const controller = new Gtk.EventControllerLegacy();
        widget.add_controller(controller);

        if (onButtonPressed) {
            controller.connect('event', (_s, e) => {
                if (e.get_event_type() === Gdk.EventType.BUTTON_PRESS)
                    return handleEvent(onButtonPressed, widget, (e as Gdk.ButtonEvent).get_button());

                return false;
            });
        }

        if (onButtonReleased) {
            controller.connect('event', (_s, e) => {
                if (e.get_event_type() === Gdk.EventType.BUTTON_RELEASE)
                    return handleEvent(onButtonReleased, widget, (e as Gdk.ButtonEvent).get_button());

                return false;
            });
        }
    }
}

function parseParams(widget: Gtk.Widget, {
    type, className, style, sensitive, tooltip, connections, properties, setup,
    halign, valign, hexpand, vexpand, visible = true,
}: WidgetProps) {
    type = type.toString();
    typecheck('className', className, ['string', 'undefined'], type);
    typecheck('style', style, ['string', 'undefined'], type);
    typecheck('sensitive', sensitive, ['boolean', 'undefined'], type);
    typecheck('tooltip', tooltip, ['string', 'undefined'], type);
    typecheck('halign', halign, ['string', 'undefined'], type);
    typecheck('valign', valign, ['string', 'undefined'], type);
    typecheck('hexpand', hexpand, ['boolean', 'undefined'], type);
    typecheck('vexpand', vexpand, ['boolean', 'undefined'], type);
    typecheck('visible', visible, 'boolean', type);

    // @ts-ignore
    widget.setStyle = (css: string) => setStyle(widget, css);

    // @ts-ignore
    widget.toggleClassName = (className: string, condition = true) => toggleClassName(widget, className, condition);

    if (typeof className === 'string') {
        className.split(' ').forEach(cn => {
            if (cn)
                widget.add_css_class(cn);
        });
    }

    if (typeof halign === 'string') {
        try {
            // @ts-ignore
            widget.halign = Gtk.Align[halign.toUpperCase()];
        } catch (err) {
            warning('wrong halign value');
        }
    }

    if (typeof valign === 'string') {
        try {
            // @ts-ignore
            widget.valign = Gtk.Align[valign.toUpperCase()];
        } catch (err) {
            warning('wrong valign value');
        }
    }

    if (typeof hexpand === 'boolean')
        widget.hexpand = hexpand;

    if (typeof vexpand === 'boolean')
        widget.vexpand = vexpand;

    if (typeof sensitive === 'boolean')
        widget.sensitive = sensitive;

    if (typeof tooltip === 'string')
        widget.set_tooltip_text(tooltip);

    if (typeof style === 'string')
        setStyle(widget, style);

    if (typeof visible === 'boolean')
        widget.visible = visible;

    if (properties) {
        properties.forEach(([key, value]) => {
            // @ts-ignore
            widget[`_${key}`] = value;
        });
    }

    if (connections) {
        connections.forEach(([s, callback, event]) => {
            if (typeof s === 'string')
                widget.connect(s, callback);

            else if (typeof s === 'number')
                interval(s, () => callback(widget), widget);

            else
                s.instance.connectWidget(widget, callback, event);
        });
    }

    if (typeof setup === 'function')
        setup(widget);
}

export default function Widget(params: Widget | string | (() => Gtk.Widget) | Gtk.Widget): Gtk.Widget {
    if (!params) {
        error('Widget from null/undefined');
        return new Gtk.Label({ label: `error widget from: "${params}"` });
    }

    if (typeof params === 'string')
        return new Gtk.Label({ label: params });

    if (typeof params === 'function')
        return params();

    if (params instanceof Gtk.Widget)
        return params;

    const {
        type, className, style, halign, valign, connections, properties,
        hexpand, vexpand, sensitive, tooltip, visible, setup,
        onFocusEnter, onFocusLeave,
        onKeyPressed, onKeyReleased,
        onMotion, onHoverEnter, onHoverLeave,
        onButtonPressed, onButtonReleased,
        onScroll, onScrollDown, onScrollUp,
        ...props
    }: Widget = params;

    let widget: Gtk.Widget | null = null;
    if (typeof type === 'function')
        widget = type();

    if (typeof type === 'string' && type in widgets)
        widget = widgets[type]({ type, ...props });

    if (widget === null) {
        error(`There is no widget with type ${type}`);
        return new Gtk.Label({ label: `${type} doesn't exist` });
    }

    parseParams(widget, {
        type, className, style, halign, valign, connections, properties,
        hexpand, vexpand, sensitive, tooltip, visible, setup,
    });

    parseEventListeners(widget, {
        onFocusEnter, onFocusLeave,
        onKeyPressed, onKeyReleased,
        onMotion, onHoverEnter, onHoverLeave,
        onButtonPressed, onButtonReleased,
        onScroll, onScrollDown, onScrollUp,
    });

    return widget;
}

Widget.widgets = widgets;
