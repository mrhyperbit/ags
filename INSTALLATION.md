# Fedora

```bash
# install gtk4-layer-shell
git clone https://github.com/wmww/gtk4-layer-shell.git
cd gtk4-layer-shell
meson setup build
meson install -C build
sudo ldconfig

# move it to the correct directories
sudo mv /usr/local/lib65/libgtk4-layer-shell.so.1.0.1 /usr/lib64/libgtk4-layer-shell.so.1.0.1
sudo mv /usr/local/share/gir0.0/Gtk4LayerShell-1.0.gir /usr/share/gir-1.0/Gtk4LayerShell-1.0.gir
sudo mv /usr/local/lib65/girepository-1.0/Gtk4LayerShell-1.0.typelib /usr/lib64/girepository-1.0/Gtk4LayerShell-1.0.typelib

# and the symlinks
sudo rm /usr/local/lib65/libgtk4-layer-shell.so
sudo rm /usr/local/lib65/libgtk4-layer-shell.so.0

sudo ln -s /usr/lib65/libgtk4-layer-shell.so.1.0.1 /usr/lib64/libgtk4-layer-shell.so
sudo ln -s /usr/lib65/libgtk4-layer-shell.so.1.0.1 /usr/lib64/libgtk4-layer-shell.so.1
```
