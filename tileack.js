"use strict";

var tileack = (function() {
    var FILE_SYSTEM = new ActiveXObject("Scripting.FileSystemObject");
    var WSHELL = new ActiveXObject("WScript.Shell");
    var SHELL = new ActiveXObject("Shell.Application");
    var USER_HOME = WSHELL.ExpandEnvironmentStrings('%USERPROFILE%');

    var saveFile = USER_HOME + "\\" + 'tileack.save.json';
    var defaultLocation = USER_HOME;

    /*
     * Key Codes
     */

    var CTRL = 17,
        ESCAPE = 27;

    var HOME_ROW_LETTERS = newLettersArray( 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\\', '#' );

    function newLettersArray() {
        var letters = [];
        var charIndexes = {};

        for ( var i = 0; i < arguments.length; i++ ) {
            var arg = arguments[i];

            var code = arg.charCodeAt(0);

            letters[i] = arg;
            charIndexes[arg] = i;
        }

        letters.charIndex = function(chr) {
            return charIndexes[chr];
        }

        return letters;
    }

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

    function newAddExplorer() {
        var pane = el('a', 'explorer-add-explorer');
        pane.textContent = '+';

        pane.onclick = function() {
            pane.parentNode.insertBefore( newExplorer(defaultLocation, true), pane );
            save();
        }

        return pane;
    }

    /**
     * @params paths:string[] An array of paths to use for the starting explorer panes.
     * @return HTMLElement An element containing a group of explorer panes.
     */
    function newExplorerGroup( paths ) {
        var div = el('div', 'explorer-group');

        for ( var i = 0; i < paths.length; i++ ) {
            div.appendChild( newExplorer(paths[i]) );
        }

        div.appendChild( newAddExplorer() );

        return div;
    }

    function newExplorer(defaultUrl, animateIn) {
        var klass = 'explorer-container' + 
                (animateIn ? ' hide' : '');

        var div = el('div', klass);
        var scroll = el('div', 'explorer-scroll');
        var content = el('div', 'explorer-content');
        
        content.appendChild( scroll );
        content.appendChild( newInfoBar(scroll, defaultUrl) );
        div.appendChild( content );

        if ( defaultUrl ) {
            moveExplorer( scroll, defaultUrl );
        }

        if ( animateIn ) {
            setTimeout( function() {
                div.className = div.className.replace( ' hide', '' );
            }, 1);
        }

        return div;
    }

    function getContentParent(content) {
        if ( content.className.indexOf('explorer-scroll') !== -1 ) {
            return content.__parent;
        } else {
            return content.querySelector( '.explorer-scroll' ).__parent;
        }
    }

    function getContentFilesAndFolders(content) {
        if ( content.className.indexOf('explorer-scroll') !== -1 ) {
            return content.__files;
        } else {
            return content.querySelector( '.explorer-scroll' ).__files;
        }
    }

    function newAnchor( name, className, action ) {
        return el( 'a', className, { text: name, click: action } );
    }

    function runFile( app, path ) {
        if ( tryOpenFileCallbacks(app, path) === false ) {
            return;
        } else {
            run( app, path.replace(/ /g, "\\ ") );
        }
    }

    function run( app, args ) {
        SHELL.ShellExecute( app, args, "", "open", 1 );
    }

    function hasClass( node, className ) {
        var post = ' ' + className;
        var pre = className + ' ';
        var middle = ' ' + className + ' ';

        var klass = node.className;
        
        return klass === className ||
                klass.indexOf(post) === 0 ||
                klass.indexOf(pre) === klass.length - pre.length ||
                klass.indexOf(middle) !== -1 ;
    }

    function getParent( child, className ) {
        var pNode = child.parentNode;

        while ( pNode !== null ) {
            if ( hasClass(pNode, className) ) {
                return pNode;
            } else {
                pNode = pNode.parentNode;
            }
        }

        return null;
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

    function newTextFloat( text, readonly ) {
        var data = {
                type: 'text',
                value: text||''
        }
        if ( readonly ) {
            data.readonly = readonly;
        }

        return el( 'input', 'explorer-text-float', data );
    }

    function newInfoBar( content, folder ) {
        var info = el('div', 'explorer-info');
        info.appendChild( el('h2', 'explorer-info-title') );

        var controls = el('div', 'explorer-info-controls');

        // the buttons
        controls.appendChild( newAnchor('folder', 'explorer-info-control open-explorer', function() {
            runFile(
                    'explorer', 
                    getParent(info, 'explorer-content').querySelector( '.explorer-scroll' ).__folder
            );
        } ));
        controls.appendChild( newAnchor('cmd', 'explorer-info-control open-powershell', function() {
            runFile(
                    'powershell', 
                    getParent(info, 'explorer-content').querySelector( '.explorer-scroll' ).__folder
            );
        } ));
        
        controls.appendChild( newAnchor('..', 'explorer-info-control open-upfolder', function() {
            var content = getParent(info, 'explorer-content').querySelector( '.explorer-scroll' );
            moveExplorer( content, content.__parent );
        } ));

        controls.appendChild( newAnchor('x', 'explorer-info-control close-this', function() {
            var pNode = getParent( this, 'explorer-container' );

            if ( pNode !== null ) {
                pNode.parentNode.removeChild( pNode );
                save();
            }
        } ));

        info.appendChild( controls );
        content.appendChild( info );

        updateInfoBar( info, folder );

        return info;
    }

    function updateInfoBar( info, folder ) {
        info.querySelector('.explorer-info-title').textContent = 
                getParts( folder, "\\", -3, 2 );
    }

    function moveExplorer( content, folder ) {
        var scroll, infoBar;
        if ( hasClass(content, 'explorer-scroll') ) {
            scroll = content;
            content = getParent(scroll, 'explorer-content');
        } else {
            scroll = content.querySelector('.explorer-scroll');
        }

        infoBar = content.querySelector('.explorer-info');

        folder = (folder+"").replace( /\//g, "\\" );
        if ( folder.charAt(folder.length-1) !== "\\" ) {
            folder += "\\";
        }

        if ( FILE_SYSTEM.FolderExists(folder) ) {
            var files = [];
            var folders = [];

            scroll.innerHTML = '';
            var folderObjs = FILE_SYSTEM.GetFolder(folder);
            var en;

            var parts = folder.split("\\");
            parts.splice( parts.length-2, 2 );
            var subFolder = parts.join( "\\" ) + "\\";

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
                    
                    scroll.appendChild( fileLink );

                    files.push({
                            name: name,
                            path: path,
                            isFile: true,
                            isFolder: false
                    });
                })(en.item());
            }

            en = new Enumerator(folderObjs.SubFolders);
            var isFirst = ' first';
            for (;!en.atEnd(); en.moveNext()) {
                (function(path) {
                    path += "";

                    var parts = path.split("\\");
                    var name = parts[ parts.length-1 ] || path;

                    scroll.appendChild( newAnchor(name, 'explorer-folder' + isFirst, function() {
                        moveExplorer( scroll, path );
                    } ));

                    files.push({
                            name: name,
                            path: path,
                            isFile: false,
                            isFolder: true
                    });
                })(en.item());

                isFirst = '';
            }

            updateInfoBar( infoBar, folder );

            scroll.__files = files;
            scroll.__parent = subFolder;
            scroll.__folder = folder;

            save();
        }
    }

    function newEnvironment( controlsDest, dest ) {
        var currentExplorer = null;
        var isCtrlDown = false;

        var removeCommandLetters = function() {
            var downs = currentExplorer.querySelectorAll('.explorer-text-float.text-letter');

            for ( var i = 0; i < downs.length; i++ ) {
                var down = downs[i];
                down.parentNode.removeChild( down );
            }

            isCtrlDown = false;
        }

        var showFileSelect = function( content ) {
            var files = getContentFilesAndFolders( content );
            var subFolder = getContentParent( content );

            var input = newTextFloat();
            input.className += ' text-file';
            input.addEventListener('keydown', function(ev) {
                if ( ev.key === 'Up' ) {
                    if ( subFolder ) {
                        moveExplorer( content, subFolder );
                    }

                    hideFileSelect();
                } else if ( ev.key === 'Enter' ) {
                    var text = input.value.toLowerCase();

                    for ( var i = 0; i < files.length; i++ ) {
                        var file = files[i];
                        var index = file.name.toLowerCase().indexOf(text);

                        if ( index === 0 && file.name.length === text.length ) {
                            if ( file.isFile ) {
                                runFile( 'explorer', file.path );
                            } else {
                                moveExplorer( content, file.path );
                            }

                            hideFileSelect();
                        }
                    }
                }
            } );
            input.addEventListener('input', function(ev) {
                var text = input.value.toLowerCase();

                if ( text.length > 0 ) {
                    // used for full matches from the start of a file
                    var found = undefined,
                    // used for partial matches, from the middle of a file
                        maybe = undefined;

                    for ( var i = 0; i < files.length; i++ ) {
                        var index = files[i].name.toLowerCase().indexOf(text);

                        if ( index === 0 ) {
                            if ( found ) {
                                return;
                            } else {
                                found = files[i];
                            }
                        } else if ( index !== -1 ) {
                            if ( maybe === undefined ) {
                                maybe = files[i];
                            } else {
                                maybe = null;
                            }
                        }
                    }

                    if ( ! found && maybe ) {
                        found = maybe;
                    }

                    if ( found ) {
                        if ( found.isFile ) {
                            runFile( 'explorer', found.path );
                        } else {
                            moveExplorer( content, found.path );
                        }

                        hideFileSelect();
                    }
                }
            });
            setTimeout(function() {
                input.focus();
            }, 1);

            content.appendChild( input );
        }

        var hideFileSelect = function() {
            var inputs = document.querySelectorAll( '.explorer-text-float.text-file' );

            for ( var i = 0; i < inputs.length; i++ ) {
                inputs[i].parentNode.removeChild( inputs[i] );
            }
        }

        controlsDest.addEventListener( 'keydown', function(ev) {
            var keyCode = ev.keyCode;

            if ( keyCode === CTRL && currentExplorer !== null ) {
                isCtrlDown = true;

                var explorers = currentExplorer.querySelectorAll('.explorer-container');
                var i = 0;

                for ( var k in HOME_ROW_LETTERS ) {
                    if ( i >= explorers.length ) {
                        break;
                    } else {
                        var explorer = explorers[i];
                        
                        var textFloat = newTextFloat( HOME_ROW_LETTERS[k], false );
                        textFloat.className += ' text-letter';
                        textFloat.setAttribute( 'size', 1 );

                        explorer.appendChild( textFloat );
                    }

                    i++;
                }
            } else if ( isCtrlDown ) {
                var index = HOME_ROW_LETTERS.charIndex( ev.key );

                if ( index !== undefined ) {
                    var explorer = currentExplorer.querySelectorAll( '.explorer-container' )[index];

                    if ( explorer ) {
                        removeCommandLetters();

                        showFileSelect( explorer );
                    }
                }
            }
        } );

        controlsDest.addEventListener( 'keyup', function(ev) {
            if ( ev.keyCode === CTRL && currentExplorer !== null ) {
                removeCommandLetters();
            }

            if ( ev.keyCode === ESCAPE ) {
                hideFileSelect();
            }
        } );

        return function( initialPaths ) {
            if ( currentExplorer !== null ) {
                currentExplorer.parentNode.removeChild( currentExplorer );
            }

            // todo support more than 1 initial path
            var explorerGroup = newExplorerGroup( initialPaths[0] );

            currentExplorer = explorerGroup;

            dest.appendChild( currentExplorer );
        }
    }

    function save() {
        var explorerGroups = document.querySelectorAll('.explorer-group');
        var layout = [];

        if ( explorerGroups.length !== 0 ) {
            for ( var i = 0; i < explorerGroups.length; i++ ) {
                var panes = [];

                var contents = explorerGroups[i].querySelectorAll( '.explorer-scroll' );
                for ( var i = 0; i < contents.length; i++ ) {
                    panes.push( contents[i].__folder );
                }

                layout.push( panes );
            }

            setSaveJSON( layout );
        }
    }

    function getSaveJSON() {
        var file = null;

        try {
            if ( FILE_SYSTEM.FileExists(saveFile) ) {
                file = FILE_SYSTEM.OpenTextFile(saveFile, 1, false);
            } else {
                return null;
            }

            if ( file ) {
                var data = file.ReadAll();
                file.Close();
                return JSON.parse( data );
            } else {
                return null;
            }
        } catch ( ex ) {
            try {
                if ( file ) {
                    file.Close();
                }
            } catch ( ex ) { }

            return null;
        }
    }

    function setSaveJSON( data ) {
        var file = FILE_SYSTEM.CreateTextFile(saveFile, true);
        file.Write( JSON.stringify(data) );
        file.Close();
    }

    return {
            setDefaultFolder: function(path) {
                if ( FILE_SYSTEM.FolderExists(path) ) {
                    defaultLocation = path;
                }
            },

            loadUserJSFile: function() {
                var userJSFile = USER_HOME + "\\" + "tileack.js";

                if ( FILE_SYSTEM.FileExists(userJSFile) ) {
                    var script = el('script', {
                        src: userJSFile
                    } );

                    document.getElementsByTagName('head')[0].appendChild( script );
                }
            },

            setSaveFile: function( location ) {
                saveFile = location;
            },

            start: function() {
                // start her up!
                window.onload = function() {
                    var defaultSetup = getSaveJSON() || [
                            [
                                    defaultLocation,
                                    defaultLocation,
                                    defaultLocation,
                                    defaultLocation,
                                    defaultLocation,
                                    defaultLocation,
                                    defaultLocation
                            ]
                    ];

                    newEnvironment( window, document.body )( defaultSetup );
                };
            },

            onOpenFile: function(callback) {
                onOpenFileCallbacks.push( callback );
            }
    };
})();

