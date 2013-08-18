# Tileäck

I pretty much Windows Explorer for project management, but on web projects, it
gets very annoying. Switch to controllers, then to models, then to view, then
back to controllers, now js, now views again, and so on.

So I built this as a way to show multiple folders, so I can quickly open files
on a whim.

This works on Windows only, as it uses the Windows scripting objects for file
and application access.

## Customization

Users scripts can be loaded to customize tileack, after it has started up, by
placing a script named 'tileack.js' into your home folder.

This file is typically placed at: C:\users\&lt;username&gt;\tileack.js

This is loaded, and allows you to hook into Tileack, for customization. 

## API

These can be called from your user script.

### onOpenFile( app:sting, path:sting )

Is called when Tileack goes to open a file. If you return false, then the 
default behaviour is skipped.

This is to allow you to do alternative behaviour instead.

