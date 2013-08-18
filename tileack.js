"use strict";

var tileack = (function() {
    var FILE_SYSTEM = new ActiveXObject("Scripting.FileSystemObject");
    var WSHELL = new ActiveXObject("WScript.Shell");
    var SHELL = new ActiveXObject("Shell.Application");

    var colours = {
            'php'   : '#e02366',
            'rb'    : '#e02366',

            'js'    : '#00A3DC',

            'html'  : '#00A971',
            'hta'   : '#00A971',

            'css'   : '#dd5e1d',

            'vimrc' : '#875FAB'
    };

    var onOpenFileCallbacks = [];

    function tryOpenFileCallbacks( app, path ) {
        for ( var i = 0; i < onOpenFileCallbacks[i]; i++ ) {
            if ( onOpenFileCallbacks[i](app, path) === false ) {
                return false;
            }
        }

        return true;
    }

    function getExtensionColour(name) {
        var parts = name.split('.');
        var extension = parts[parts.length-1];

        return colours[extension];
    }

    function getParts(str, seperator, index, len) {
        if ( typeof str !== 'string' ) {
            str += "";
        }

        if ( len === undefined ) {
            len = 1;
        }

        var parts = str.split( seperator );
        var r = '';

        if ( index < 0 ) {
            index = Math.max( 0, parts.length + index );
        }

        var end = Math.min( parts.length, index+len );

        for ( var i = index; i < end; i++ ) {
            if ( i !== index ) {
                r += seperator;
            }

            r += parts[i];
        }

        return r;
    }

    function newExplorerGroup( num ) {
        var div = el('div', 'explorer-group');

        for ( var i = 0; i < num; i++ ) {
            div.appendChild( newExplorer("c:\\users\\joseph\\projects") );
        }

        return div;
    }

    function newExplorer(defaultUrl) {
        var div = el('div', 'explorer-container');
        var scroll = el('div', 'explorer-scroll');
        var content = el('div', 'explorer-content');
        var top = el('input', 'explorer-bar', {
                type: 'text',
                keyup: function(ev) {
                    if ( ev.keyCode !== 27 ) {
                        var folder = top.value;

                        moveExplorer( scroll, top, folder );
                    }
                }
        });

        div.appendChild( top );
        div.appendChild( content );
        content.appendChild( scroll );

        if ( defaultUrl ) {
            moveExplorer( scroll, top, defaultUrl );
        }

        return div;
    }

    function newAnchor( name, className, action ) {
        return el( 'a', className, { text: name, click: action } );
    }

    function runFile( app, path ) {
        run( app, path.replace(/ /g, "\\ ") );
    }

    function run( app, args ) {
        SHELL.ShellExecute( app, args, "", "open", 1 );
    }

    function el( type ) {
        var node = document.createElement(type);

        if ( type === 'a' ) {
            node.setAttribute( 'href', '#' );
        }

        for ( var i = 1; i < arguments.length; i++ ) {
            var arg = arguments[i];

            if ( typeof arg === 'string' ) {
                if ( node.className === '' || node.className === undefined ) {
                    node.className = arg;
                } else {
                    node.className += ' ' + arg;
                }
            } else {
                for ( var key in arg  ) {
                    var val = arg[key];

                    var k = key.toLowerCase();

                    if (
                            k === 'click' ||
                            k === 'keyup' ||
                            k === 'keydown' ||
                            k === 'keypress' ||
                            k === 'load' ||
                            k === 'mousedown' ||
                            k === 'mousemove' ||
                            k === 'mouveup' ||
                            k === 'mouseclick'
                    ) {
                        node.addEventListener( key, val );
                    } else if ( 
                            k === 'html' ||
                            k === 'innerhtml'
                    ) {
                        node.innerHTML = val;
                    } else if (
                            k === 'text' ||
                            k === 'textcontent'
                    ) {
                        node.textContent = val;
                    } else {
                        node.setAttribute( key, val );
                    }
                }
            }
        }

        return node;
    }

    function newInfoBar( folder, content ) {
        var parts = folder.split("\\");

        var info = el('div', 'explorer-info');

        info.textContent = getParts( folder, "\\", -3, 2 );

        parts.splice( parts.length-2, 2 );
        var subFolder = parts.join( "\\" ) + "\\";

        var controls = el('div', 'explorer-info-controls');

        // the buttons
        controls.appendChild( newAnchor('folder', 'explorer-info-control open-explorer', function() {
            runFile( 'explorer', folder );
        } ));
        controls.appendChild( newAnchor('cmd', 'explorer-info-control open-powershell', function() {
            runFile( 'powershell', folder );
        } ));

        controls.appendChild( newAnchor('..', 'explorer-info-control open-upfolder', function() {
            moveExplorer( content, top, subFolder );
        } ));

        info.appendChild( controls );
        content.appendChild( info );

        return info;
    }

    function moveExplorer( content, top, folder ) {
        folder = (folder+"").replace( /\//g, "\\" );
        if ( folder.charAt(folder.length-1) !== "\\" ) {
            folder += "\\";
        }

        if ( FILE_SYSTEM.FolderExists(folder) ) {
            var folders = [];

            content.innerHTML = '';
            var folderObjs = FILE_SYSTEM.GetFolder(folder);
            var en;

            content.appendChild( newInfoBar(folder, content) );

            en = new Enumerator(folderObjs.Files);
            for (;!en.atEnd(); en.moveNext()) {
                (function(path) {
                    path += "";

                    var parts = path.split("\\");
                    var name = parts[ parts.length-1 ] || path;

                    var fileLink = newAnchor(name, 'explorer-file', function() {
                        runFile( 'explorer', path );
                    });
                    var fileLink = newAnchor(name, 'explorer-file', function() {
                        runFile( 'explorer', path );
                    });

                    var colour = getExtensionColour( name );
                    if ( colour ) {
                        fileLink.style.background = colour;
                    }
                    
                    content.appendChild( fileLink );
                })(en.item());
            }

            en = new Enumerator(folderObjs.SubFolders);
            var isFirst = ' first';
            for (;!en.atEnd(); en.moveNext()) {
                (function(path) {
                    path += "";

                    var parts = path.split("\\");
                    var name = parts[ parts.length-1 ] || path;

                    content.appendChild( newAnchor(name, 'explorer-folder' + isFirst, function() {
                        moveExplorer( content, top, path );
                    } ));
                })(en.item());

                isFirst = '';
            }

            top.value = folder;
        }
    }

    return {
            loadUserJSFile: function() {
                var userHome = WSHELL.ExpandEnvironmentStrings('%USERPROFILE%');
                var userJSFile = userHome + "\\" + "tileack.js";

                if ( FILE_SYSTEM.FileExists(userJSFile) ) {
                    var script = el('script', {
                        src: userJSFile
                    } );

                    document.getElementsByTagName('head')[0].appendChild( script );
                }
            },

            start: function() {
                // start her up!
                window.onload = function() {
                    var explorer = newExplorerGroup( 6 );
                    document.body.appendChild( explorer );
                };
            },

            onOpenFile: function(callback) {
                onOpenFileCallbacks.push( callback );
            }
    };
})();

