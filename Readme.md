# c4

I pretty much use Windows Explorer for project management and it works but 
having to work across lots of different windows sucks. You either have to be 
moving around all the time or have millions of explorer windows open.

c4 is an attempt to solve this problem by being a project manager which is not
tied to my editor in any way, and allows me to navigate across the files of
different projects quickly.

The aim is that any file in any project can be opened at any time in 1 to 4 key 
board presses.

![example of c4](http://i.imgur.com/5B5B6kk.png);

This works on Windows only as it uses the Windows scripting objects for file
and application access.

## KeyBoard Commands

The keyboard controls for c4 feel a tad obfuscated but the aim is to be able to
open things quickly.

The core commands are ...

 * 1 to 0 keys on the num row switch between projects
 * w to p keys switch between folders within a project
 * a to l keys open a folder in that project
 * q also switches between current project and the previous one

## Customization

Users scripts can be loaded to customize c4 after it has started up by placing 
a script named 'c4.js' into your home folder.

This file is typically placed at: C:\\users\\&lt;username&gt;\\c4.js

This is loaded and allows you to hook into c4.

## Save File

c4 will save your current projects in your home folder,
in a file called '.c4.save.json'.

This is typically located at: C:\\users\\&lt;username&gt;\\.c4.save.json

## API

These can be called from your user script.

### setDefaultFolder( path )

For new explorer panes this is the folder they will open by default. The path
must exist.

If no default folder is given then it will use your home directory by default.

### onOpenFile( app:sting, path:sting )

Is called when ĞяϵϵΚ goes to open a file. If you return false then the 
default behaviour is skipped.

This is to allow you to do alternative behaviour instead.

