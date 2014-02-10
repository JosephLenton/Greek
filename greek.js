"use strict";

var greek = (function() {
    var greekCore = window.greekCore = window.greekCore || {};

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

    var F12     = 123   ,
        SHIFT   = 16    ,
        CTRL    = 17    ,
        ALT     = 18    ,
        ESCAPE  = 27    ;

    var HOME_ROW_LETTERS = [ 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\\', '#' ];

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

    var openWiths = {};
    var openWithsAlt = {};

    var currentExplorer = null;

    /**
     * Displays a prompt, asking for the user to enter a value.
     * 
     * After the user has done this, the callback given is then called with the
     * result.
     */
    /*
     * Currently this uses 'window.prompt', but by changing the code here, this
     * could be changed to a better looking prompt overlay.
     */
    var showPrompt = function( displayText, defaultOption, callback ) {
        var name = window.prompt( displayText, defaultOption );

        callback( name );
    }

    /**
     * Displays a confirmation box, asking the user to hit yes or no.
     * If the user hits yes, then the callback is called.
     *
     * @param title optional The title for the confirmation box.
     * @param text The text to appear inside the box for the user.
     * @param callback the callback to call.
     */
    var showConfirm = function( title, text, callback ) {
        overlay.showConfirm( title, text, callback );
    }

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
    var getExtension = function( name ) {
        var extension = name.lastSplit('.');

        if ( extension.indexOf('\\') !== -1 || extension.indexOf('/') !== -1 ) {
            return '';
        } else {
            return extension;
        }
    }

    var getExtensionColour = function(name) {
        return extensionColours[getExtension(name)];
    }

    var getParts = function(str, seperator, index, len) {
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

    var newAddExplorer = function() {
        return bb('a.explorer-add-explorer', {
            text: '+',
            click: function() {
                this.parentNode.insertBefore( newExplorer(defaultLocation, true), this );
                save();
            }
        })
    }

    /**
     * @params paths:string[] An array of paths to use for the starting explorer panes.
     * @return HTMLElement An element containing a group of explorer panes.
     */
    var newExplorerGroup = function( environment, projectsBar, folders, show ) {
        var div = bb('.explorer-group');

        if ( show ) {
            currentExplorer = div;
        } else {
            div.className += ' hide';
        }

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

    var newExplorer = function(defaultUrl, animateIn) {
        var scroll = bb('.explorer-scroll');

        var div = bb({
                className: 'explorer-container' + ( animateIn ? ' hide' : '' ),

                '.explorer-content': [
                        scroll,
                        newInfoBar( scroll, defaultUrl )
                ]
        });

        if ( defaultUrl ) {
            moveExplorer( scroll, defaultUrl, true );
        }

        if ( animateIn ) {
            bb.removeClass.later( div, 'hide' );
        }

        return div;
    }

    var setTitle = function(text) {
        if ( text ) {
            document.title = TITLE_PREFIX + TITLE_SEPERATOR + text;
        } else {
            document.title = TITLE_PREFIX;
        }
    }

    var getContentParent = function(content) {
        if ( content.className.indexOf('explorer-scroll') !== -1 ) {
            return content.__parent;
        } else {
            return content.querySelector( '.explorer-scroll' ).__parent;
        }
    }

    var getContentFilesAndFolders = function(content) {
        if ( content.className.indexOf('explorer-scroll') !== -1 ) {
            return content.__files;
        } else {
            return content.querySelector( '.explorer-scroll' ).__files;
        }
    }

    var openFile = function( path ) {
        var ext = getExtension( path );

        if ( ext && openWiths.hasOwnProperty(ext) ) {
            runFile( openWiths[ext], path );
        } else {
            runFile( DEFAULT_APPLICATION, path );
        }
    }

    var runFile = function( app, path ) {
        run( app, path.replace(/ /g, "\\ ") );
    }

    var run = function( app, args ) {
        SHELL.ShellExecute( app, args, "", "open", 1 );
    }

    var getParent = function( child, className ) {
        var pNode = child.parentNode;

        while ( pNode !== null ) {
            if ( bb.hasClass(pNode, className) ) {
                return pNode;
            } else {
                pNode = pNode.parentNode;
            }
        }

        return null;
    }

    var newInfoBar = function( content, folder ) {
        var info = bb('div.explorer-info', {
                'h2.explorer-info-title': { },
                
                // close this folder
                'a.explorer-info-close': {
                    text: 'x',
                    click: function() {
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
                    }
                },

                /* the buttons */
                'div.explorer-info-controls': {
                    // open the folder in explorer
                    'a.explorer-info-control open-explorer': {
                            text: 'explorer',
                            click: function() {
                                runFile( DEFAULT_APPLICATION, 
                                    getParent(info, 'explorer-content').
                                            querySelector( '.explorer-scroll' ).
                                            __folder
                                )
                            }
                    },

                    'a.explorer-info-control new-file': {
                            text: 'file',
                            click: showPrompt.curry( "file name", '', function(name) {
                                if ( name ) {
                                    try {
                                        var file = FILE_SYSTEM.CreateTextFile( name, false, true );

                                        if ( file ) {
                                            file.close();

                                            refreshExplorer( content );
                                        }
                                    } catch (ex) {
                                        // do nothing; file already exists, or no access
                                    }
                                }
                            })
                    },

                    'a.explorer-info-control new-folder': {
                            text: 'folder',
                            click: showPrompt.curry( "folder name", '', function(name) {
                                if ( name ) {
                                    try {
                                        FILE_SYSTEM.CreateFolder( name );
                                        refreshExplorer( content );
                                    } catch (ex) {
                                        // do nothing; folder already exists, or no access
                                    }
                                }
                            })
                    },

                    // open a powershell folder at this location
                    'a.explorer-info-control open-powershell': {
                            text: 'cmd',
                            click: function() {
                                runFile( DEFAULT_TERMINAL_APPLICATION, 
                                    getParent(info, 'explorer-content').
                                            querySelector( '.explorer-scroll' ).
                                            __folder
                                )
                            }
                    },
                    
                    // move up one folder
                    'a.explorer-info-control open-upfolder': {
                        text: '..',
                        click: function() {
                            var content = getParent(info, 'explorer-content').querySelector( '.explorer-scroll' );
                            moveExplorer( content, content.__parent );
                        }
                    }
                }
        });

        content.appendChild( info );

        updateInfoBar( info, folder );

        return info;
    }

    var updateInfoBar = function( info, folder ) {
        info.querySelector('.explorer-info-title').textContent = 
                getParts( folder, "\\", -3, 2 );
    }

    /**
     * The content redisplays it's content.
     *
     * This will not cause a save, as the content is not saved to disk.
     */
    var refreshExplorer = function( content ) {
        moveExplorer( content, content.__folder, true );
    }

    var moveExplorer = function( content, folderPath, noSave ) {
        var scroll, infoBar;
        if ( bb.hasClass(content, 'explorer-scroll') ) {
            scroll = content;
            content = getParent(scroll, 'explorer-content');
        } else {
            scroll = content.querySelector('.explorer-scroll');
        }

        infoBar = content.querySelector('.explorer-info');

        var folder = (folderPath+"").replace( /\//g, "\\" );
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

                    var name = path.lastSplit( "\\" ) || path;

                    var fileLinkWrap = bb( 'div.explorer-file', {
                            style: {
                                background: getExtensionColour( name ) || ''
                            },

                            'a.explorer-item-link': {
                                    text: name,
                                    click: openFile.curry( path )
                            }
                    });

                    if ( openWithsAlt.hasOwnProperty(getExtension(path)) ) {
                        fileLinkWrap.appendChild( bb( 'a.explorer-item-link-alt', {
                            click: runFile.curry( openWithsAlt[getExtension(path)], path )
                        }));
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

            en = new Enumerator( folderObjs.SubFolders );
            var isFirst = 'first';
            for (;!en.atEnd(); en.moveNext()) {
                (function(path) {
                    path += "";

                    var name = path.lastSplit("\\") || path;

                    scroll.appendChild( bb( 'div.explorer-folder', isFirst, {
                        'a.explorer-item-link': {
                            text: name,
                            click: moveExplorer.curry( scroll, path )
                        },

                        'a.explorer-item-link-alt': {
                            click: runFile.curry( DEFAULT_APPLICATION, path )
                        }
                    }) );

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

    var showExplorerGroup = function( environment, div, skipSave ) {
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

    var newEnvironment = function( controlsDest, saveData ) {
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

            var input = bb('text.explorer-text-float.text-file', {
                    'keydown': function(ev) {
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
                    },

                    'input': function(ev) {
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
                    }
            });

            content.appendChild( input );
            input.callLater( 'focus' );
        }

        var hideFileSelect = function() {
            var inputs = document.querySelectorAll( '.explorer-text-float.text-file' );

            for ( var i = 0; i < inputs.length; i++ ) {
                inputs[i].parentNode.removeChild( inputs[i] );
            }
        }

        controlsDest.addEventListener( 'keydown', function(ev) {
            if ( ev.shiftKey && currentExplorer !== null ) {
                isCtrlDown = true;

                var explorers = currentExplorer.querySelectorAll('.explorer-container');
                var i = 0;

                for ( var k in HOME_ROW_LETTERS ) {
                    if ( i >= explorers.length ) {
                        break;
                    } else {
                        explorers[i].appendChild(
                                bb('text.explorer-text-float.text-letter', { 
                                        text: HOME_ROW_LETTERS[k],
                                        size: 1
                                })
                        );
                    }

                    i++;
                }
            } else if ( isCtrlDown ) {
                var index = HOME_ROW_LETTERS.indexOf( ev.key );

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
            if ( ev.keyCode === SHIFT && currentExplorer !== null ) {
                removeCommandLetters();
            }

            if ( ev.keyCode === ESCAPE ) {
                hideFileSelect();
            }
        } );

        controlsDest.addEventListener( 'click', function(ev) {
            var pane = environment.querySelector( '.explorer-project-delete-pane.show' )

            if ( pane ) {
                pane.classList.remove( 'show' );
            }
        });

        if ( currentExplorer !== null ) {
            currentExplorer.parentNode.removeChild( currentExplorer );
        }

        var environment = bb('div', 'explorer-environment');

        var projectsBar = newProjectsBar(environment);

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

    var addProjectsBarStub = function(projectsBar, stub, skipSave) {
        projectsBar.insertBefore(
                stub,
                projectsBar.querySelector('.explorer-add-project') 
        );

        if ( ! skipSave ) {
            save();
        }
    }

    var newProjectsBar = function(environment) {
        return bb('div.explorer-projects', {
                'a.explorer-add-project': {
                        text: '+',
                        click: function() {
                            var newExp = newExplorerGroup( environment, this.parentNode, null, false );
                            environment.appendChild( newExp, this );

                            var projectStub = newProjectStub( environment, newExp, DEFAULT_PROJECT_NAME );
                            addProjectsBarStub( this.parentNode, projectStub );

                            showExplorerGroup( environment, newExp );
                            showProjectStub( environment, projectStub );
                        }
                }
        });
    }

    var showProjectStub = function( environment, projectStub ) {
        if ( projectStub ) {
            if ( ! bb.hasClass(projectStub, 'show') ) {
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

    var newProjectStub = function( environment, explorerGroup, strName, show ) {
        if ( show ) {
            setTitle( strName );
        }

        return bb( '.explorer-project' + (show ? ' show' : ''), {
                click: function() {
                    showExplorerGroup( environment, explorerGroup );
                    showProjectStub( environment, this );
                },

                'h3.explorer-project-name': {
                        text: strName,
                        click: function(ev) {
                            // todo
                        }
                },

                'text.explorer-project-rename': {
                        text: 'rename',
                        click: function() {
                            showPrompt("set name", name.textContent, function(r) {
                                if ( r !== null && r !== '' ) {
                                    name.textContent = r;

                                    setTitle( r );
                                    save();
                                }
                            });
                        }
                },

                '.explorer-project-delete-pane': {
                        'a.explorer-project-delete-button yes': {
                                text: 'yes',
                                click: function(ev) {
                                    if ( environment.querySelectorAll('.explorer-project').length > 1 ) {
                                        var stub = this.parentNode.parentNode;

                                        explorerGroup.parentNode.removeChild( explorerGroup );

                                        if ( ! explorerGroup.classList.contains('hide') ) {
                                            // find the previous project to select, before this one
                                            var projectStubIndex = -1;
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
                                }
                        },

                        'a.explorer-project-delete-button no': {
                                text: 'no',
                                click: function(ev) {
                                    bb.removeClass( this.parentNode, 'show' );
                                }
                        },

                        click: function(ev) {
                            ev.stopPropagation();
                        }
                },

                'a.explorer-project-delete': {
                        text: 'x',
                        click: function(ev) {
                            bb.addClass(
                                    this.parentNode.querySelector( '.explorer-project-delete-pane' ),
                                    'show'
                            );

                            ev.stopPropagation();
                        }
                }
        });
    }

    var save = function() {
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
                        show: ! bb.hasClass( explorerGroup, 'hide' )
                });
            }

            setSaveJSON( saveGroups );
        }
    }

    var getSaveJSON = function() {
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

    var setSaveJSON = function( data ) {
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
                var userJSFile = USER_HOME + "\\" + ".greek.js";

                if ( FILE_SYSTEM.FileExists(userJSFile) ) {
                    var script = bb('script', {
                        src: userJSFile
                    } );

                    document.getElementsByTagName('head')[0].appendChild( script );
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
                    theOneEnvironment = newEnvironment( window, getSaveJSON() )

                    document.body.appendChild( theOneEnvironment );
                    
                    var helpInfo = new window.greekCore.HelpOverlay();
                    document.body.appendChild( helpInfo.getDom() );

                    var disableKeyEvents = function(ev) {
                        ev.preventDefault();
                        ev.stopPropagation();

                        return false;
                    }

                    document.body.addEventListener('keydown', function(ev) {
                        if ( ev.keyCode === F12 ) {
                            helpInfo.show();

                            document.body.addEventListener('keydown', disableKeyEvents, true);
                            document.body.addEventListener('keyup', disableKeyEvents, true);
                            document.body.addEventListener('keypress', disableKeyEvents, true);

                            return disableKeyEvents(ev);
                        }
                    }, true);

                    document.body.addEventListener('keyup', function(ev) {
                        if ( ev.keyCode === F12 ) {
                            helpInfo.hide();

                            document.body.removeEventListener('keydown', disableKeyEvents, true);
                            document.body.removeEventListener('keyup', disableKeyEvents, true);
                            document.body.removeEventListener('keypress', disableKeyEvents, true);

                            return disableKeyEvents(ev);
                        }
                    }, true);

                    document.body.addEventListener( 'keydown', function(ev) {
                        if ( ev.keyCode === 112 ) {
                            ev.preventDefault();
                            showConfirm( 'this is a test', 'test text', function() {
                                // todo
                            });
                        }
                    });
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

