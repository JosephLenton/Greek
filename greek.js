"use strict";

var greek = (function() {
    var FILE_SYSTEM = new ActiveXObject("Scripting.FileSystemObject");
    var WSHELL = new ActiveXObject("WScript.Shell");
    var SHELL = new ActiveXObject("Shell.Application");
    var USER_HOME = WSHELL.ExpandEnvironmentStrings('%USERPROFILE%');

    var saveFile = USER_HOME + "\\" + '.greek.save.json';
    var defaultLocation = USER_HOME;

    var DEFAULT_PROJECT_NAME = 'project';

    // when in doubt, open with this!
    var DEFAULT_APPLICATION = 'explorer';

    /*
     * When you click 'cmd', this is the application that will be used,
     * for the command line window.
     */
    var DEFAULT_TERMINAL_APPLICATION = 'powershell';

    /**
     * Values used for building the title, for when it updates.
     *
     * Prefix appeares at the start, always.
     * The seperator appeares if, there is something following the prefix.
     */
    var TITLE_PREFIX    = document.title,
        TITLE_SEPERATOR = ', '      ;

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

    var extensionColours = {
            // text

            'txt'   : '#457',
            'md'    : '#556B2F',

            // source codes
            
            'qb'    : '#ff0066',
            'rb'    : '#df0000',

            'php'   : '#B22222',

            'ts'    : '#9900ff',
            'js'    : '#00A3DC',
            'jsx'   : '#1190C0',

            'json'  : '#0090C0',

            'html'  : '#00A971',
            'hta'   : '#00A971',

            'css'   : '#dd5e1d',

            'sql'   : '#980',

            'vbs'   : '#aa1',
            'cs'    : '#bb0',

            // configs & logs
            
            'vimrc'         : '#875FAB',
            'vsvimrc'       : '#875FAB',

            'conf'          : '#D2691E',
            'log'           : '#900000',

            'gitignore'     : '#611',
            'gitconfig'     : '#611',
            'gitattributes' : '#611',

            'htaccess'      : '#631',

            // executables
            
            'bat'   : '#3f4f5f',
            'exe'   : '#004040',

            // images

            'png'   : '#556b2f',
            'jpg'   : '#808000',
            'jpeg'  : '#808000',
            'gif'   : '#6b8e23',

            'svg'   : '#ff9900',

            // fonts

            'ttf'   : '#dd5522',
            'otf'   : '#dd5522',
            'woff'  : '#cc6633',
            'eot'   : '#cc5511'
    };

    var theOneEnvironment = null;
    var isProjectsOpen = true;

    var openWiths = {};
    var openWithsAlt = {};

    var currentExplorer = null;

    /**
     * Returns the file extension for the name given.
     *
     * The extension does *not* include the '.'. So the extension of 
     * 'index.html', would be just 'html'.
     *
     * If no extension can be derived, such as giving 'index' on it's own, then
     * this will return an empty string.
     *
     * File that start with a dot however, such as '.vimrc', will return the
     * name as their file extension. So in that example, it will return 'vimrc'.
     *
     * @param name The path of file name, to find the extension of.
     * @return An empty string if no extension found, otherwise the extension.
     */
    function getExtension( name ) {
        var parts = name.split('.');
        var extension = parts[parts.length-1];

        if ( extension.indexOf('\\') !== -1 || extension.indexOf('/') !== -1 ) {
            return '';
        } else {
            return extension;
        }
    }

    function getExtensionColour(name) {
        return extensionColours[getExtension(name)];
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
    function newExplorerGroup( environment, projectsBar, folders, show ) {
        var div = el('div', 'explorer-group' + (!show ? ' hide' : ''));

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

    function setTitle(text) {
        if ( text ) {
            document.title = TITLE_PREFIX + TITLE_SEPERATOR + text;
        } else {
            document.title = TITLE_PREFIX;
        }
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

    function openFile( path ) {
        var ext = getExtension( path );

        if ( ext && openWiths.hasOwnProperty(ext) ) {
            runFile( openWiths[ext], path );
        } else {
            runFile( DEFAULT_APPLICATION, path );
        }
    }

    function runFile( app, path ) {
        run( app, path.replace(/ /g, "\\ ") );
    }

    function run( app, args ) {
        SHELL.ShellExecute( app, args, "", "open", 1 );
    }

    function hasClass( node, className ) {
        var klass = node.className;
        
        return klass === className ||
                klass.indexOf(      className + ' ') === 0 ||
                klass.indexOf(' ' + className      ) === (klass.length - (className.length + 1)) ||
                klass.indexOf(' ' + className + ' ') !== -1 ;
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

        /* the buttons */
        
        // open the folder in explorer
        controls.appendChild( newAnchor('folder', 'explorer-info-control open-explorer', function() {
            runFile(
                    DEFAULT_APPLICATION, 
                    getParent(info, 'explorer-content').querySelector( '.explorer-scroll' ).__folder
            );
        } ));

        // open a powershell folder at this location
        controls.appendChild( newAnchor('cmd', 'explorer-info-control open-powershell', function() {
            runFile(
                    DEFAULT_TERMINAL_APPLICATION, 
                    getParent(info, 'explorer-content').querySelector( '.explorer-scroll' ).__folder
            );
        } ));
        
        // move up one folder
        controls.appendChild( newAnchor('..', 'explorer-info-control open-upfolder', function() {
            var content = getParent(info, 'explorer-content').querySelector( '.explorer-scroll' );
            moveExplorer( content, content.__parent );
        } ));

        // close this folder
        controls.appendChild( newAnchor('x', 'explorer-info-control close-this', function() {
            var pNode = getParent( this, 'explorer-container' );

            if ( pNode !== null ) {
                pNode.className += ' hide';

                var callback = function() {
                    if ( pNode.parentNode ) {
                        pNode.parentNode.removeChild( pNode );
                        save();
                    }
                }

                pNode.addEventListener( 'transitionend', callback );
                setTimeout( callback, 200 ); // fallback, should end *after* the transition
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

                    var fileLinkWrap = el( 'div', 'explorer-file' );

                    var fileLink = newAnchor(name, 'explorer-item-link', function() {
                        openFile( path );
                    });

                    fileLinkWrap.appendChild( fileLink );

                    if ( openWithsAlt.hasOwnProperty(getExtension(path)) ) {
                        var altLink = newAnchor('', 'explorer-item-link-alt', function() {
                            runFile( openWithsAlt[getExtension(path)], path );
                        });

                        fileLinkWrap.appendChild( altLink );
                    }

                    var colour = getExtensionColour( name );
                    if ( colour ) {
                        fileLinkWrap.style.background = colour;
                    }
                    
                    scroll.appendChild( fileLinkWrap );

                    files.push({
                            name: name,
                            path: path,
                            isFile: true,
                            isFolder: false
                    });
                })(en.item());
            }

            en = new Enumerator(folderObjs.SubFolders);
            var isFirst = 'first';
            for (;!en.atEnd(); en.moveNext()) {
                (function(path) {
                    path += "";

                    var parts = path.split("\\");
                    var name = parts[ parts.length-1 ] || path;

                    var folderWrap = el( 'div' , 'explorer-folder', isFirst );
                    
                    folderWrap.appendChild( newAnchor(name, 'explorer-item-link', function() {
                        moveExplorer( scroll, path );
                    } ));

                    folderWrap.appendChild( newAnchor('', 'explorer-item-link-alt', function() {
                        runFile( DEFAULT_APPLICATION, path );
                    } ));

                    scroll.appendChild( folderWrap );

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

            scroll.__files  = files;
            scroll.__parent = subFolder;
            scroll.__folder = folder;

            if ( ! noSave ) {
                save();
            }
        }
    }

    function showExplorerGroup( environment, div, skipSave ) {
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

            if ( ! skipSave ) {
                save();
            }
        }
    }

    function newEnvironment( controlsDest, saveData, isProjectsOpen ) {
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
                                openFile( file.path );
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
                            openFile( found.path );
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
        var projectsBar = newProjectsBar(environment, isProjectsOpen);

        if ( saveData === null || saveData.length === 0 ) {
            var explorerGroup = newExplorerGroup( environment, projectsBar, null, true );

            var projectStub = newProjectStub( environment, explorerGroup, DEFAULT_PROJECT_NAME );
            addProjectsBarStub( projectsBar, projectStub, true );

            environment.appendChild( explorerGroup );

            showExplorerGroup( environment, explorerGroup );
            showProjectStub( environment, projectStub );
        } else {
            var altShowExp = null,
                onlyShowFirst = false;

            for ( var i = 0; i < saveData.length; i++ ) {
                var expData = saveData[i];

                var showThisOne = !onlyShowFirst && expData.show ;

                var explorerGroup = newExplorerGroup( environment, projectsBar, expData.folders, showThisOne );
                environment.appendChild( explorerGroup );

                var projectStub = newProjectStub( environment, explorerGroup, expData.name, showThisOne );
                addProjectsBarStub( projectsBar, projectStub, true );

                // show the first explorer, or the one marked
                if ( i === 0 ) {
                    altShowExp = {
                            explorerGroup: explorerGroup,
                            projectStub: projectStub
                    };
                }
   
                if ( showThisOne ) {
                    altShowExp = null;
                    onlyShowFirst = true;
                }
            }

            if ( altShowExp !== null ) {
                showExplorerGroup( environment, altShowExp.explorerGroup );
                showProjectStub( environment, altShowExp.projectStub );
            }
        }

        environment.appendChild( projectsBar );

        return environment;
    }

    function addProjectsBarStub(projectsBar, stub, skipSave) {
        projectsBar.insertBefore(
                stub,
                projectsBar.querySelector('.explorer-add-project') 
        );

        if ( ! skipSave ) {
            save();
        }
    }

    function openProjectsBar( environment ) {
        if ( environment.className.indexOf(' show-projects') === -1 ) {
            environment.className += ' show-projects';
        }
    }

    function closeProjectsBar( environment ) {
        if ( environment.className.indexOf(' show-projects') !== -1 ) {
            environment.className = environment.className.replace(' show-projects', '');
        }
    }

    function toggleProjectsBar( environment ) {
        if ( environment.className.indexOf(' show-projects') === -1 ) {
            environment.className += ' show-projects';
        } else {
            environment.className = environment.className.replace(' show-projects', '');
        }
    }

    function newProjectsBar(environment, isProjectsOpen) {
        var projectsBar = el('div', 'explorer-projects');

        projectsBar.appendChild(
                el('a', 'explorer-projects-open', {
                        text: '>>',
                        click: function() {
                            toggleProjectsBar( environment );
                        }
                })
        );

        var addProject = el('a', 'explorer-add-project', {
                    text: '+',
                    click: function() {
                        var newExp = newExplorerGroup( environment, projectsBar, null, false );
                        environment.appendChild( newExp, addProject );

                        var projectStub = newProjectStub( environment, newExp, DEFAULT_PROJECT_NAME );
                        addProjectsBarStub( projectsBar, projectStub );

                        showExplorerGroup( environment, newExp );
                        showProjectStub( environment, projectStub );
                    }
        });

        projectsBar.appendChild( addProject );

        if ( isProjectsOpen ) {
            openProjectsBar( environment );
        }

        return projectsBar;
    }

    function showProjectStub( environment, projectStub ) {
        if ( projectStub ) {
            if ( ! hasClass(projectStub, 'show') ) {
                var showProject = environment.querySelector('.explorer-project.show');

                if ( showProject ) {
                    showProject.className = showProject.className.replace( ' show', '' );
                }

                projectStub.className += ' show';
            }

            setTitle( projectStub.querySelector( '.explorer-project-name' ).textContent );
        } else {
            setTitle( '' );
        }
    }

    function newProjectStub( environment, explorerGroup, name, show ) {
        var stub = el('div', 'explorer-project' + (show ? ' show' : ''), {
                click: function() {
                    showExplorerGroup( environment, explorerGroup );
                    showProjectStub( environment, stub );
                }
        });

        var name = el('h3', 'explorer-project-name', { text: name });

        var rename = el('a', 'explorer-project-button rename', {
                text: 'rename',
                click: function() {
                    var r = window.prompt("set name", name.textContent);

                    if ( r !== null && r !== '' ) {
                        name.textContent = r;

                        setTitle( r );
                        save();
                    }
                }
        });

        var deleteStub = el('a', 'explorer-project-button delete', {
                text: 'del',
                click: function(ev) {
                    if ( environment.querySelectorAll('.explorer-project').length > 1 ) {
                        explorerGroup.parentNode.removeChild( explorerGroup );

                        if ( explorerGroup.className.indexOf(' hide') === -1 ) {
                            // find the previous project to select, before this one
                            var projectStubIndex = -2;
                            for ( var node = stub.previousSibling; node; node = node.previousSibling ) {
                                projectStubIndex++;
                            } 

                            projectStubIndex = Math.max( 0, projectStubIndex );

                            stub.parentNode.removeChild( stub );

                            showExplorerGroup( environment, environment.querySelectorAll('.explorer-group')[ projectStubIndex ] );
                            showProjectStub( environment, environment.querySelectorAll('.explorer-project')[ projectStubIndex ] );
                        } else {
                            stub.parentNode.removeChild( stub );
                        }

                        save();
                    }

                    ev.stopPropagation();
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
                        show: ! hasClass( explorerGroup, 'hide' )
                });
            }

            setSaveJSON( saveGroups );
        }
    }

    function getSaveJSON() {
        var file = null;

        try {
            if ( FILE_SYSTEM.FileExists(saveFile) ) {
                file = FILE_SYSTEM.OpenTextFile(saveFile, 1, false, -1);
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
        var file = FILE_SYSTEM.CreateTextFile(saveFile, true, true);
        file.Write( JSON.stringify(data) );
        file.Close();
    }

    return {
            addExtensionColor: function( ext, color ) {
                extensionColours[ getExtension(ext) ] = color;
            },

            setDefaultFolder: function(path) {
                if ( FILE_SYSTEM.FolderExists(path) ) {
                    defaultLocation = path;
                }

                return this;
            },

            loadUserJSFile: function() {
                var userJSFile = USER_HOME + "\\" + "greek.js";

                if ( FILE_SYSTEM.FileExists(userJSFile) ) {
                    var script = el('script', {
                        src: userJSFile
                    } );

                    document.getElementsByTagName('head')[0].appendChild( script );
                }

                return this;
            },

            openProjectsBar: function() {
                if ( theOneEnvironment === null ) {
                    isProjectsOpen = true;
                } else {
                    openProjectsBar( theOneEnvrionment );
                }

                return this;
            },

            closeProjectsBar: function() {
                if ( theOneEnvironment === null ) {
                    isProjectsOpen = false;
                } else {
                    closeProjectsBar( theOneEnvrionment );
                }

                return this;
            },

            setSaveFile: function( location ) {
                saveFile = location;

                return this;
            },

            start: function() {
                // start her up!
                window.onload = function() {
                    theOneEnvironment = newEnvironment( window, getSaveJSON(), isProjectsOpen )

                    document.body.appendChild( theOneEnvironment );
                };

                return this;
            },

            openWith: function( extension, app, altApp ) {
                if ( arguments.length >= 3 && altApp === null && app ) {
                    altApp = DEFAULT_APPLICATION;
                }

                if ( app === null ) {
                    app = DEFAULT_APPLICATION;
                }

                // remove the starting dot, if it's there
                if ( extension.charAt(0) === '.' ) {
                    extension = extension.substring( 1 );
                }

                if ( app ) {
                    openWiths[ extension ] = app;
                }

                if ( altApp ) {
                    openWithsAlt[ extension ] = altApp;
                }

                return this;
            }
    };
})();

