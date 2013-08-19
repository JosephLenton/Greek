# Tileäck

I pretty much Windows Explorer for project management, but on web projects, it
gets very annoying. Switch to controllers, then to models, then to view, then
back to controllers, now js, now views again, and so on.

So I built this as a way to show multiple folders, so I can quickly open files
on a whim.

This works on Windows only, as it uses the Windows scripting objects for file
and application access.

## KeyBoard Commands

The keyboard controls for Tileack are a tad complicated, but they are built for
fast usage. Once you know them, you can navigate and open files quickly.

### Fast File/Folder opening

The keys along the home row, a through l all representing different explorer 
panes.

 * a - select first pane
 * s - select second pane
 * d - select third pane
 * f - select fourth pane
 * g - select fifth pane
 * h - select sixth pane
 * j - select seventh pane
 * k - select eight pane
 * l - select ninth pane

You can then select what to open in that pane by typing in the name, and the 
moment something is found which matches, it is opened. 

Press up to move to the folder above.

## Customization

Users scripts can be loaded to customize tileack, after it has started up, by
placing a script named 'tileack.js' into your home folder.

This file is typically placed at: C:\users\&lt;username&gt;\tileack.js

This is loaded, and allows you to hook into Tileack, for customization. 

## API

These can be called from your user script.

### setDefaultFolder( path )

For new explorer panes, this is the folder they will open by default. The path
must exist.

If no default folder is given, then it will use your home directory by default.

### onOpenFile( app:sting, path:sting )

Is called when Tileack goes to open a file. If you return false, then the 
default behaviour is skipped.

This is to allow you to do alternative behaviour instead.

