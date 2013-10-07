# ĞяϵϵΚ

I pretty much use Windows Explorer for project management, and it works, but 
having to work across lots of different sucks. You either have to be moving
around all the time, or have millions of explorer windows open.

ĞяϵϵΚ is an attempt to solve this problem. Down the left you can have 
'projects', which are groups of folders. When you select one, all their folders
are listed across the page.

![example of ĞяϵϵΚ](http://i.imgur.com/vHsk4u6.png);

This works on Windows only, as it uses the Windows scripting objects for file
and application access.

## KeyBoard Commands

The keyboard controls for ĞяϵϵΚ are a tad complicated, but they are built for
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

Users scripts can be loaded to customize ĞяϵϵΚ, after it has started up, by
placing a script named 'greek.js' into your home folder.

This file is typically placed at: C:\\users\\&lt;username&gt;\\greek.js

This is loaded, and allows you to hook into ĞяϵϵΚ, for customization. 

## Save File

ĞяϵϵΚ will save your current projects in your home folder,
in a file called '.greek.save.json'.

This is typically located at: C:\\users\\&lt;username&gt;\\.greek.save.json

## API

These can be called from your user script.

### setDefaultFolder( path )

For new explorer panes, this is the folder they will open by default. The path
must exist.

If no default folder is given, then it will use your home directory by default.

### onOpenFile( app:sting, path:sting )

Is called when ĞяϵϵΚ goes to open a file. If you return false, then the 
default behaviour is skipped.

This is to allow you to do alternative behaviour instead.

