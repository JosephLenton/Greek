
===============================================================================

# Cursor

This is the code to operate the focus cursor that moves around Greek.

===============================================================================

    var a = bb('div.foobar', {
        'a.foo': function() { alert('blah'); }
    });

    var greekCore = window.greekCore = ( window.greekCore || {} );

    greekCore.Cursor = function(explorer) {
        this.events = {};
        this.explorer = explorer;
    }

    greekCore.Cursor.prototype.bind = function( key, callback ) {
        events[key] = callback;
    }

    greekCore.Cursor.prototype.moveRight = function( ) {
    }
    greekCore.Cursor.prototype.moveLeft = function() {
    }

    greekCore.Cursor.prototype.moveDown = function() {
    }
    greekCore.Cursor.prototype.moveUp = function() {
    }

-------------------------------------------------------------------------------

### cursor.onKeyPress( ev:KeyEvent )

Call this to handle the on key event for this cursor.

-------------------------------------------------------------------------------

    greekCore.Cursor.prototype.onKeyPress = function(ev) {
        if ( ! ev.altKey && ! ev.shiftKey && ! ev.ctrlKey ) {
            var callback = events[ev.key || ev['char']];

            if ( callback ) {
                ev.stopPropagation();
                ev.preventDefault();

                // todo pass in the current file 
                callback( );

                return false;
            }
        }
    }

