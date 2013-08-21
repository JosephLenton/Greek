"use strict";

var tileack = (function() {
    var FILE_SYSTEM = new ActiveXObject("Scripting.FileSystemObject");
    var WSHELL = new ActiveXObject("WScript.Shell");
    var SHELL = new ActiveXObject("Shell.Application");
    var USER_HOME = WSHELL.ExpandEnvironmentStrings('%USERPROFILE%');

    var saveFile = USER_HOME + "\\" + '.tileack.save.json';
    var defaultLocation = USER_HOME;

    var DEFAULT_PROJECT_NAME = 'project';

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
            'php'   : '#B22222',
            'rb'    : '#e02366',

            'ts'    : '#8f7fa6',
            'js'    : '#00A3DC',

            'html'  : '#00A971',
            'hta'   : '#00A971',

            'md'    : '#556B2F',

            'css'   : '#dd5e1d',

            'sql'   : '#980',

            'vimrc' : '#875FAB',

            'conf'  : '#D2691E',
            'log'   : '#800000',

            'bat'   : '#3f4f5f',
            'exe'   : '#004040'
    };

    var onOpenFileCallbacks = [];

    var currentExplorer = null;

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
    function newExplorerGroup( environment, projectsBar, folders, hide ) {
        var div = el('div', 'explorer-group' + (hide ? ' hide' : ''));

        if ( folders === null ) {
            folders = [ 
                    defaultLocation,
                    defaultLocation,
                    defaultLocation,
                    defaultLocation,
                    defaultLocation
            ];
        }

        for ( var i = 0; i < folders.length; i++ ) {
            div.appendChild( newExplorer(folders[i]) );
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
            moveExplorer( scroll, defaultUrl, true );
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
                klass.indexOf(pre) === (klass.length - pre.length)+1 ||
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

    function moveExplorer( content, folder, noSave ) {
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

            if ( ! noSave ) {
                save();
            }
        }
    }

    function showExplorer( environment, div, skipSave ) {
        var groups = environment.querySelectorAll( '.explorer-group' );

        if ( currentExplorer !== div ) {
            var oldExplorer = currentExplorer;
            currentExplorer = null;

            for ( var i = 0; i < groups.length; i++ ) {
                var group = groups[i];

                if ( group === div ) {
                    group.className = group.className.replace(' hide', '');
                    currentExplorer = div;
                } else if ( group.className.indexOf(' hide') === -1 ) {
                    group.className += ' hide';
                }
            }

            if ( skipSave ) {
                save();
            }
        }
    }

    function newEnvironment( controlsDest, saveData ) {
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

                    ev.preventDefault();
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

        if ( currentExplorer !== null ) {
            currentExplorer.parentNode.removeChild( currentExplorer );
        }

        var environment = el('div', 'explorer-environment');
        var projectsBar = newProjectsBar(environment);

        if ( saveData === null || saveData.length === 0 ) {
            var explorerGroup = newExplorerGroup( environment, projectsBar, null, false );
            environment.appendChild( explorerGroup );

            addProjectsBarStub(
                    projectsBar,
                    newProjectStub(environment, explorerGroup, DEFAULT_PROJECT_NAME)
            );

            showExplorer( explorerGroup );
        } else {
            var altShowExp = null;

            for ( var i = 0; i < saveData.length; i++ ) {
                var expData = saveData[i];

                var explorerGroup = newExplorerGroup( environment, projectsBar, expData.folders, expData.hide );
                environment.appendChild( explorerGroup );
                addProjectsBarStub(
                        projectsBar,
                        newProjectStub(environment, explorerGroup, expData.name)
                );

                // show the first explorer, or the one marked
                if ( i === 0 ) {
                    altShowExp = explorerGroup;
                }

                if ( ! expData.hide ) {
                    showExplorer( explorerGroup );
                    altShowExp = null;
                }
            }

            if ( altShowExp !== null ) {
                altShowExp.className = altShowExp.className.replace( ' hide', '' );
                showExplorer( altShowExp );
            }
        }

        environment.appendChild( projectsBar );

        return environment;
    }

    function addProjectsBarStub(projectsBar, stub) {
        projectsBar.insertBefore(
                stub,
                projectsBar.querySelector('.explorer-add-project') 
        );

        save();
    }

    function newProjectsBar(environment) {
        var projectsBar = el('div', 'explorer-projects');

        projectsBar.appendChild(
                el('a', 'explorer-projects-open', {
                        text: '>>',
                        click: function() {
                            if ( environment.className.indexOf(' show-projects') === -1 ) {
                                environment.className += ' show-projects';
                            } else {
                                environment.className = environment.className.replace(' show-projects', '');
                            }
                        }
                })
        );

        var addProject = el('a', 'explorer-add-project', {
                    text: '+',
                    click: function() {
                        var newExp = newExplorerGroup( environment, projectsBar, null );
                        environment.appendChild( newExp, addProject );

                        addProjectsBarStub(
                                projectsBar, 
                                newProjectStub( environment, newExp, DEFAULT_PROJECT_NAME )
                        );

                        showExplorer( environment, newExp );
                    }
        });

        projectsBar.appendChild( addProject );

        return projectsBar;
    }

    function newProjectStub( environment, explorerGroup, name ) {
        var stub = el('div', 'explorer-project', {
                click: function() {
                    showExplorer( environment, explorerGroup );
                }
        });

        var name = el('h3', 'explorer-project-name', { text: name });

        var rename = el('a', 'explorer-project-button rename', {
                text: 'rename',
                click: function() {
                    var r = window.prompt("set name", name.textContent);

                    if ( r !== null && r !== '' ) {
                        name.textContent = r;
                        save();
                    }
                }
        });

        var deleteStub = el('a', 'explorer-project-button delete', {
                text: 'del',
                click: function() {
                    if ( environment.querySelectorAll('.explorer-project').length > 1 ) {
                        explorerGroup.parentNode.removeChild( explorerGroup );
                        stub.parentNode.removeChild( stub );

                        if ( explorerGroup.className.indexOf(' hide') === -1 ) {
                            showExplorer( environment.querySelector('.explorer-group') );
                        }

                        save();
                    }
                }
        });

        stub.appendChild( name );
        stub.appendChild( rename );
        stub.appendChild( deleteStub );

        return stub;
    }

    function save() {
        var explorerGroups = document.querySelectorAll('.explorer-group');
        var projectNames = document.querySelectorAll('.explorer-project-name');
        var saveGroups = [];

        if ( explorerGroups.length !== 0 && projectNames.length !== 0 ) {
            for ( var i = 0; i < explorerGroups.length; i++ ) {
                var explorerGroup = explorerGroups[i];
                var name = projectNames[i].textContent;

                var folders = [];

                var contents = explorerGroup.querySelectorAll( '.explorer-scroll' );

                for ( var j = 0; j < contents.length; j++ ) {
                    folders.push( contents[j].__folder );
                }

                saveGroups.push({
                        name: name,
                        folders: folders,
                        hide: !hasClass( explorerGroup, 'hide' )
                });
            }

            setSaveJSON( saveGroups );
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
                    document.body.appendChild(
                            newEnvironment( window, getSaveJSON() )
                    );
                };
            },

            onOpenFile: function(callback) {
                onOpenFileCallbacks.push( callback );
            }
    };
})();

