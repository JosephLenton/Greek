"use strict";

(function() {
    var c4 = window.c4 || (window.c4 = {});
    c4.core || ( c4.core = {} )

    var FILE_SYSTEM = new ActiveXObject("Scripting.FileSystemObject");
    var WSHELL = new ActiveXObject("WScript.Shell");
    var SHELL = new ActiveXObject("Shell.Application");
    var USER_HOME = WSHELL.ExpandEnvironmentStrings('%USERPROFILE%');

    var saveFile = USER_HOME + "\\" + '.c4.save.json';
    var defaultFolder = USER_HOME;

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

    var PROJECT_SELECT_LETTERS = '1234567890'.split('');
    var FOLDER_SELECT_LETTERS = 'wertyuiop[]'.split('');
    var FILE_LETTERS = 'asdfghjkl;\'#'.split('');

    var extensionColours = {
            // text

            'txt'           : '#445577',
            'md'            : '#245C10',

            // source codes
            
            'qb'            : '#ff0066',
            'rb'            : '#631411',

            'php'           : '#B22222',

            'ts'            : '#9900ff',
            'js'            : '#1F8FCF',
            'jsx'           : '#00A3DC',

            'json'          : '#0090C0',

            'html'          : '#00A971',
            'hta'           : '#00A971',

            'css'           : '#dd5e1d',

            'sql'           : '#998800',

            'vbs'           : '#aaaa11',
            'cs'            : '#bbbb00',

            'pl'            : '#11634F',

            // configs & logs
            
            'vimrc'         : '#875FAB',
            'vsvimrc'       : '#875FAB',

            'conf'          : '#D2691E',
            'log'           : '#900000',

            'gitignore'     : '#661111',
            'gitconfig'     : '#661111',
            'gitattributes' : '#661111',

            'htaccess'      : '#663311',

            // executables
            
            'bat'           : '#2f4f8f',
            'exe'           : '#004040',

            // images

            'png'           : '#556b2f',
            'jpg'           : '#808000',
            'jpeg'          : '#808000',
            'gif'           : '#6b8e23',

            'svg'           : '#ff9900',

            // fonts

            'ttf'           : '#dd5522',
            'otf'           : '#dd5522',
            'woff'          : '#cc6633',
            'eot'           : '#cc5511'
    };

    var fileNameColours = {
            'makefile'      : '#774400'
    };

    var openWiths = {};
    var openWithsAlt = {};

    var currentProject = null;
    var lastProject = null;

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

    var isFileNameValid = function( name ) {
        return name && 

                // disallow certain names
                name !== '' &&
                name !== ' ' &&
                name !== '.' &&
                name !== '..' &&

                // name does not contain certain characters
                name.indexOf('\\') === -1 &&
                name.indexOf('/') === -1 &&
                name.indexOf(':') === -1 &&
                name.indexOf('?') === -1 &&
                name.indexOf('!') === -1 &&
                name.indexOf('*') === -1 &&
                name.indexOf('<') === -1 &&
                name.indexOf('>') === -1 ;
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

    var getFileColour = function(name) {
        return fileNameColours[ name ] ||
                extensionColours[ getExtension(name) ] ||
                '' ;
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

    var newDefaultProject = function() {
        return {
            name    : DEFAULT_PROJECT_NAME,
            show    : false,
            folders : [
                    {
                            path: defaultFolder,
                            isSelected: true
                    },
                    {
                            path: defaultFolder,
                            isSelected: false
                    },
                    {
                            path: defaultFolder,
                            isSelected: false
                    }
            ]
        };
    }

    /**
     * @params folders An array of folders to use for the starting explorer panes.
     * @return HTMLElement An element containing a group of explorer panes.
     */
    var newExplorerGroup = function( environment, projectsBar, folders ) {
        assertArray( folders, "No folders provided for new explorer group" );
        assert( folders.length > 0, "Empty folders provided for explorer group" );

        // ensure 1 folder is selected
        var hasSelected = false;
        folders.map( function(folder) {
            if ( folder.isSelected === true ) {
                hasSelected = true;
                return false;
            }
        } );

        if ( ! hasSelected && folders.length > 0 ) {
            folders[0].isSelected = true;
        }

        var explorerGroup = bb( '.explorer-group', 'c4-hide',
                folders.map( newExplorer ),

                bb('a.explorer-add-explorer', {
                        text: '+',

                        click: function() {
                            var path = defaultFolder;

                            var lastExplorer = explorerGroup.querySelector( '.explorer-container:last-of-type' );
                            if ( lastExplorer && lastExplorer.__folder ) {
                                path = lastExplorer.__folder;
                            }

                            var explorerContainer = newExplorer({ path: path });
                            refreshExplorer( explorerContainer );
                            explorerContainer.classList.add( 'c4-hide' );

                            this.parentNode.insertBefore( explorerContainer, this );

                            bb.removeClass.future( explorerContainer, 'c4-hide' );

                            save();
                        }
                })
        );

        return explorerGroup;
    }

    var newExplorer = function(folder) {
        assert( folder, "No folder provided" );
        assert( folder.path, "No path found in folder" );

        return bb({
                className: {
                    'explorer-container': true,

                    'c4-selected'       : !! folder.isSelected
                },

                '.explorer-content': {
                    html: bb('.explorer-scroll')
                },

                init: function() {
                    this.querySelector( '.explorer-content' ).appendChild(
                            newInfoBar( this, folder.path )
                    );

                    this.__files  = [];
                    this.__parent = getParentFolder( folder.path );
                    this.__folder = folder.path;
                }
        });
    }

    var setTitle = function(text) {
        if ( text ) {
            //document.title = TITLE_PREFIX + TITLE_SEPERATOR + text;
            document.title = text;
        } else {
            document.title = ':: ' + TITLE_PREFIX + ' ::';
        }
    }

    /**
     * Given the path to a file or folder, this will return the parent folder
     * for it.
     *
     * If the parent is as high as you can go however, there are no more 
     * parents, then the same folder is returned.
     *
     * For example
     *
     *  // returns "c:\users\joe\projects\"
     *  getParentFilder( "c:\users\joe\projects\c4" )
     *
     *  // returns "c:\"
     *  getParentFilder( "c:\\" )
     *
     *  // returns "\"
     *  getParentFilder( "\\" )
     *
     * @param folder The folder to find the parent of.
     */
    /*
     * It works by deleting everything from the last path seperated to the end
     * of the string. As it removed the path seperator it is then put back.
     *
     * Deleting the chunk at the end is what makes it move up a folder.
     *
     * Putting the seperator back is what makes "c:\" to "c:\", and "\" to "\",
     * both work.
     */
    var getParentFolder = function( folder ) {
        return folder.replace( /(\\)[^\\]+(\\+)?$/, '\\' );
    }

    /**
     * This tries to find the folder for the path given.
     *
     * So if the path given is a folder then it's just returned.
     * But if it is given a file then it returns the parent folder for that 
     * file.
     */
    var getFolderFromPath = function( filePath ) {
        if ( FILE_SYSTEM.FolderExists(filePath) ) {
            return filePath;
        } else {
            return getParentFolder( filePath );
        }
    }

    var commandLineSafeString = function( path ) {
        return path.replace(/ /g, "\\ ");
    }

    var openFile = function( filePath, useAlt ) {
        var ext = getExtension( filePath );

        if ( ext ) {
            if ( useAlt && openWithsAlt[ext] ) {
                runFile( openWithsAlt[ext], filePath );
            } else if ( openWiths.hasOwnProperty(ext) ) {
                runFile( openWiths[ext], filePath );
            } else {
                runFile( DEFAULT_APPLICATION, filePath );
            }
        } else {
            runFile( DEFAULT_APPLICATION, filePath );
        }
    }

    var runFile = function( app, filePath ) {
        run( app, commandLineSafeString(filePath), getFolderFromPath(filePath) ) ;
    }

    var run = function( app, args, workingDir ) {
        if ( ! workingDir ) {
            workingDir = "";
        }

        SHELL.ShellExecute( app, args, workingDir, "open", 1 );
    }

    var newInfoBar = function( container, folder ) {
        return bb('div.explorer-info', {
                'h2.explorer-info-title': {
                    text: folderToInfoBarTitle( folder )
                },
                
                // close this folder
                'a.explorer-info-delete': {
                    text: 'x',
                    click: function(ev) {
                        container.classList.add( 'c4-hide' );

                        bb.once( container, 'transitionend', function() {
                            if ( container.parentNode ) {
                                container.parentNode.removeChild( container );
                            }
                        } );

                        ev.stopPropagation();
                        save();
                    }
                },

                /* the buttons */
                'div.explorer-info-controls': {
                    // open the folder in explorer
                    'a.explorer-info-control open-explorer': {
                            text: 'explorer',
                            click: function() {
                                runFile( DEFAULT_APPLICATION, container.__folder );
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

                                            refreshExplorer( container );
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
                                        refreshExplorer( container );
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
                                run( DEFAULT_TERMINAL_APPLICATION,
                                        "-NoExit",
                                        container.__folder );
                            }
                    },
                    
                    // move up one folder
                    'a.explorer-info-control open-upfolder': {
                        text: '..',
                        click: function() {
                            moveExplorer( container, container.__parent, false );
                        }
                    }
                }
        });
    }

    var folderToInfoBarTitle = function( folder ) {
        return getParts( folder, "\\", -3, 2 );
    }

    var refreshExplorerGroup = function( project ) {
        project.querySelectorAll( '.explorer-container.c4-selected' ).map( refreshExplorer );
    }

    /**
     * The content redisplays it's content.
     *
     * This will not cause a save, as the content is not saved to disk.
     */
    var refreshExplorer = function( container ) {
        moveExplorer( container, container.__folder, true );
    }

    var moveExplorer = function( container, folderPath, noSave ) {
        assertString( folderPath, "Expected 'folderPath' to be a string." );

        setTimeout(function() {
            var scroll  = container.querySelector( '.explorer-content > .explorer-scroll' );
            var infoBar = container.querySelector( '.explorer-content > .explorer-info'   );

            var folder = folderPath.replace( /\//g, "\\" );
            if ( folder.charAt(folder.length-1) !== "\\" ) {
                folder += "\\";
            }

            var folderExists = FILE_SYSTEM.FolderExists( folder );

            bb.toggleClass( container, 'c4-folder-not-found', ! folderExists );

            var files   = [];
            var folders = [];
            scroll.innerHTML = '';

            if ( folderExists ) {
                var folderObjs = FILE_SYSTEM.GetFolder(folder);
                var en;

                en = new Enumerator(folderObjs.Files);
                for (;!en.atEnd(); en.moveNext()) {
                    (function(path) {
                        path += "";

                        var name = path.lastSplit( "\\" ) || path;

                        var fileLinkWrap = bb( 'div.explorer-item.explorer-file', {
                                style: {
                                    background: getFileColour( name )
                                },

                                'a.explorer-item-link': {
                                    text: name,
                                    click: openFile.curry( path, false )
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

                        scroll.appendChild( bb( 'div.explorer-item.explorer-folder', isFirst, {
                            'a.explorer-item-link': {
                                text: name,
                                click: runFile.curry( DEFAULT_APPLICATION, path )
                            },

                            'a.explorer-item-link-alt': {
                                click: moveExplorer.curry( container, path, false )
                            }
                        }) );

                        files.push({
                                name: name,
                                path: path,
                                isFile: false,
                                isFolder: true
                        });
                    })( en.item() );

                    isFirst = '';
                }
            }

            container.__files  = files;
            container.__parent = getParentFolder( folder );
            container.__folder = folder;

            infoBar.querySelector('.explorer-info-title').textContent =
                    folderToInfoBarTitle( folder );

            if ( ! noSave ) {
                save();
            }
        }, 0 );
    }

    var showExplorerGroup = function( environment, div, skipSave ) {
        environment.
                querySelectorAll( '.explorer-group:not(.c4-hide)' ).
                map(function(div) {
                    div.classList.add( 'c4-hide' );
                });

        div.classList.remove( 'c4-hide' );

        div.querySelectorAll( '.explorer-container' ).map( refreshExplorer );

        if ( ! skipSave ) {
            save();
        }
    }

    var newEnvironment = function( controlsDest, saveData ) {
        assertArray( saveData, "No default data provided for the environment to be setup" );
        assert( saveData.length > 0, "Empty save data provided" );

        var nonInputFunction = function(callback) {
            return function(ev) {
                if ( ! (ev.target instanceof HTMLInputElement) ) {
                    var current = environment.querySelector('.explorer-project.c4-show')

                    if ( current ) {
                        ev.preventDefault();

                        return callback( ev, current );
                    }
                }
            }
        }

        // keys w to ] for selecting the folders
        var folderSelectKeys = {};
        FOLDER_SELECT_LETTERS.map( function(key, i) {
            folderSelectKeys[key] = (function(i) {
                return nonInputFunction(function(ev, current) {
                    var explorerGroup = current.__explorerGroup;

                    var next = current.__explorerGroup.querySelector( '.explorer-container:nth-of-type(' + (i+1) + ')' );
                    if ( 
                            next && 
                            ! next.classList.contains('c4-selected')
                    ) {
                        var old = explorerGroup.querySelector( '.explorer-container.c4-selected' );
                        if ( old ) {
                            old.classList.remove( 'c4-selected' );
                        }

                        next.classList.add( 'c4-selected' );
                    }
                });
            })(i);
        });

        // Add the keyboard hotkeys for keys 1 to 0 along the top row for 
        // selecting a project.
        var projectSelectKeys = {};
        PROJECT_SELECT_LETTERS.map( function(key, i) {
            projectSelectKeys[key] = (function(i) {
                return nonInputFunction(function(ev, current) {
                    var next = current.parentNode.querySelector(
                            '.explorer-project:nth-of-type(' + (i+1) + ')' );

                    if ( next ) {
                        showProject( environment, next );
                    }
                });
            })(i);
        });

        var fileSelectKeys = {};
        FILE_LETTERS.map( function(key, i) {
            var keyOps = 'shift ' + key + ', ' + key;

            fileSelectKeys[keyOps] = (function(i) {
                return nonInputFunction(function(ev, current) {
                    var explorerDiv = current.__explorerGroup.querySelector( '.explorer-container.c4-selected' );

                    if ( explorerDiv ) {
                        var file = explorerDiv.__files[i];

                        if ( file ) {
                            if ( file.isFile ) {
                                openFile( file.path, !! ev.shiftKey );
                            } else if ( file.isFolder ) {
                                runFile( DEFAULT_APPLICATION, file.path )
                            }

                            // ping the div
                            var div = explorerDiv.querySelector(
                                    '.explorer-content > .explorer-scroll > .explorer-item:nth-child(' + (i+1) + ')' );
                            if ( div ) {
                                div.classList.add( 'c4-ping' );
                                bb.once( div, 'transitionend', function() {
                                    this.classList.remove( 'c4-ping' );
                                });
                            }
                        }
                    }
                });
            })(i);
        });

        bb.on( controlsDest, {
                'keyup escape': function(ev) {
                    // todo, cancel the current control stack
                },

                'keypress': [ 
                        folderSelectKeys,
                        projectSelectKeys, 
                        fileSelectKeys,
                        {
                            'q': nonInputFunction(function(ev, current) {
                                if ( lastProject ) {
                                    showProject( environment, lastProject );
                                }
                            }),
                            
                            'backspace': nonInputFunction(function(ev, current) {
                                // todo delete project
                            }),
                            
                            // rename project
                            'enter': nonInputFunction(function(ev, current) {
                                var input = current.querySelector( '.explorer-project-name' );
                                input.focus();
                                input.value = input.value;
                            }),

                            // previous project
                            '-': nonInputFunction(function(ev, current) {
                                showProject( environment, bb.previousWrap(current, '.explorer-project') );
                            }),

                            // next project
                            '+': nonInputFunction(function(ev, current) {
                                showProject( environment, bb.nextWrap(current, '.explorer-project') );
                            })
                        },

                        {
                            // forcefully refreshes the current project
                            '\\': nonInputFunction(function(ev, current) {
                                refreshExplorerGroup( current.__explorerGroup );
                            }),

                            // create a new file
                            'b': nonInputFunction(function(ev, current) {
                                var container = current.__explorerGroup.querySelector(
                                        '.explorer-container.c4-selected' );

                                if ( container ) {
                                    showPrompt( "What call new file?", '', function(name) {
                                        if ( isFileNameValid(name) ) {
                                            var path = container.__folder + '/' + name;

                                            if ( ! FILE_SYSTEM.FileExists(path) ) {
                                                var file = FILE_SYSTEM.CreateTextFile(path, false, true);
                                                file.Close();
                                                refreshExplorer( container );
                                            }
                                        }
                                    } )
                                }
                            }),
                            
                            // create a new folder
                            'v': nonInputFunction(function(ev, current) {
                                var container = current.__explorerGroup.querySelector(
                                        '.explorer-container.c4-selected' );

                                if ( container ) {
                                    showPrompt( "What call new folder?", '', function(name) {
                                        if ( isFileNameValid(name) ) {
                                            var path = container.__folder + '/' + name;

                                            if ( ! FILE_SYSTEM.FileExists(path) ) {
                                                FILE_SYSTEM.CreateFolder( path );
                                                refreshExplorer( container );
                                            }
                                        }
                                    } )
                                }
                            }),

                            // open explorer for current folder
                            'c': nonInputFunction(function(ev, current) {
                                var container = current.__explorerGroup.querySelector(
                                        '.explorer-container.c4-selected' );

                                if ( container ) {
                                    runFile( DEFAULT_APPLICATION, container.__folder );
                                }
                            }),

                            // open command line for currently selected folder
                            'n': nonInputFunction(function(ev, current) {
                                var container = current.__explorerGroup.querySelector(
                                        '.explorer-container.c4-selected' );

                                if ( container ) {
                                    run( DEFAULT_TERMINAL_APPLICATION,
                                            "-NoExit",
                                            container.__folder );
                                }
                            }),

                            // open command line in first folder
                            'm': nonInputFunction(function(ev, current) {
                                var container = current.__explorerGroup.querySelector(
                                        '.explorer-container:first-of-type' );

                                if ( container ) {
                                    run( DEFAULT_TERMINAL_APPLICATION,
                                            "-NoExit",
                                            container.__folder );
                                }
                            })
                        }
                ]
        });

        bb.on( controlsDest, ['click', 'keypress'], function(ev) {
            var target = ev.target;

            /*
             * I am not sure why, but sometimes the parent can be missing a
             * classList when this event fires. So I check for it first.
             *
             * It only happens right after I delete a project and then enter a
             * command right after ASAP.
             */
            if ( 
                      target &&
                      target.parentNode && 
                      target.parentNode.classList &&
                    ! target.classList.contains( 'explorer-project-delete-pane' ) &&
                    ! target.parentNode.classList.contains('explorer-project-delete-pane')
            ) {
                var pane = environment.querySelector( '.explorer-project-delete-pane.c4-show' )

                if ( pane ) {
                    pane.classList.remove( 'c4-show' );
                }
            }
        });

        if ( currentProject !== null ) {
            var currentExplorer = currentProject.__explorerGroup;
            currentExplorer.parentNode.removeChild( currentExplorer );
            currentProject = null;
        }

        var environment = bb('div', 'explorer-environment');

        var projectsBar = newProjectsBar( environment );

        var projectStubToShow = null,
            hasSeenShow = false;

        for ( var i = 0; i < saveData.length; i++ ) {
            var expData = saveData[i];

            var explorerGroup = newExplorerGroup( environment, projectsBar, expData.folders );
            environment.appendChild( explorerGroup );

            var projectStub = newProjectStub( environment, explorerGroup, expData.name );
            addProjectsBarStub( projectsBar, projectStub, true );

            // show the first explorer, or the one marked
            if ( 
                    i === 0 || 
                    ( ! hasSeenShow && expData.show )
            ) {
                projectStubToShow = projectStub ;
            }
        }

        if ( projectStubToShow !== null ) {
            showProject( environment, projectStubToShow );
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
                            var project = newDefaultProject();

                            var newExp = newExplorerGroup( environment, this.parentNode, project.folders );
                            environment.appendChild( newExp, this );

                            var projectStub = newProjectStub( environment, newExp, project.name );
                            addProjectsBarStub( this.parentNode, projectStub );

                            showProject( environment, projectStub );
                        }
                }
        });
    }

    var showProject = function( environment, projectStub ) {
        if (
                projectStub &&
              ! projectStub.classList.contains('c4-show') &&
                projectStub !== currentProject 
        ) {
            lastProject = currentProject;
            if ( lastProject === null ) {
                lastProject = projectStub;
            }

            currentProject = projectStub;

            showProjectStub( environment, projectStub );
            showExplorerGroup( environment, projectStub.__explorerGroup );
        }
    }

    var showProjectStub = function( environment, projectStub ) {
        if ( projectStub ) {
            if ( ! projectStub.classList.contains('c4-show') ) {
                var currentProject = environment.querySelector('.explorer-project.c4-show');

                if ( currentProject ) {
                    currentProject.classList.remove( 'c4-show' );
                }

                projectStub.classList.add( 'c4-show' );
            }

            setTitle( projectStub.querySelector( '.explorer-project-name' ).value );
        }
    }

    var deleteProjectStub = function( environment, projectStub, explorerGroup ) {
        if ( environment.querySelectorAll('.explorer-project').length > 1 ) {
            explorerGroup.parentNode.removeChild( explorerGroup );

            if ( ! explorerGroup.classList.contains('c4-hide') ) {
                // find the previous project to select, before this one
                var projectStubIndex = -1;
                for ( var node = projectStub.previousSibling; node; node = node.previousSibling ) {
                    projectStubIndex++;
                } 

                projectStubIndex = Math.max( 0, projectStubIndex );

                projectStub.parentNode.removeChild( projectStub );

                showProject( environment, environment.querySelectorAll('.explorer-project')[ projectStubIndex ] );
            } else {
                projectStub.parentNode.removeChild( projectStub );
            }

            save();
        }
    }

    var newProjectStub = function( environment, explorerGroup, strName ) {
        return bb( '.explorer-project', {
                init: function() {
                    this.__explorerGroup = explorerGroup;
                },

                click: function() {
                    showProject( environment, this );
                },

                'text.explorer-project-name': {
                        text: strName,

                        keypress: function(ev) {
                            if ( ev.keyCode === 13 /* enter */ ) {
                                ev.preventDefault();
                                this.blur();
                            } else if ( ev.keyCode === 27 /* escape */ ) {
                                this.value = strName;

                                ev.preventDefault();
                                this.blur();
                            }
                        },

                        blur: function() {
                            // save on change
                            if ( this.value !== strName ) {
                                strName = this.value;

                                save();
                            }
                        }
                },

                '.explorer-project-delete-pane': {
                        stopPropagation: [ 'click', 'keypress' ],

                        'keypress': {
                            escape: function() {
                                this.classList.remove( 'c4-show' );
                            }
                        },

                        'a.explorer-project-delete-button yes': {
                                text: 'yes',
                                click: function(ev) {
                                    deleteProjectStub( environment, this.parentNode.parentNode, explorerGroup );
                                },
                                'keypress enter': function(ev) {
                                    deleteProjectStub( environment, this.parentNode.parentNode, explorerGroup );
                                }
                        },

                        'a.explorer-project-delete-button no': {
                                text: 'no',
                                click: function(ev) {
                                    this.parentNode.classList.remove( 'c4-show' );
                                }
                        }
                },

                'a.explorer-project-delete': {
                        text: 'x',
                        tabindex: -1,
                        click: function(ev) {
                            bb.addClass(
                                    this.parentNode.querySelector( '.explorer-project-delete-pane' ),
                                    'c4-show'
                            );

                            ev.stopPropagation();
                        }
                }
        });
    }

    

    /// 
    /// Saving
    /// 
    
    var save = (function() {
        var explorerGroups = document.querySelectorAll('.explorer-group');
        var projectNames = document.querySelectorAll('.explorer-project-name');
        var saveGroups = [];

        if ( explorerGroups.length !== 0 && projectNames.length !== 0 ) {
            for ( var i = 0; i < explorerGroups.length; i++ ) {
                var explorerGroup = explorerGroups[i];
                var name = projectNames[i].value;

                var folders = [];

                var contents = explorerGroup.querySelectorAll( '.explorer-container' );

                for ( var j = 0; j < contents.length; j++ ) {
                    var folderDiv = contents[j];

                    if ( ! folderDiv.className.contains('c4-hide') ) {
                        var folder = folderDiv.__folder;

                        folders.push({
                                path        : folder,
                                isSelected  : folderDiv.classList.contains('c4-selected')
                        });
                    }
                }

                saveGroups.push({
                        name    : name,
                        folders : folders,
                        show    : ! bb.hasClass( explorerGroup, 'c4-hide' )
                });
            }

            writeObjToFile( saveFile, saveGroups );
        }
    }).throttle( 500 );

    var updateSaveDataFormat = function( data ) {
        if ( data !== null ) {
            for ( var i = 0; i < data.length; i++ ) {
                var folderGroup = data[i];
                var folders = folderGroup.folders;

                for ( var j = 0; j < folders.length; j++ ) {
                    var folder = folders[j];

                    if ( typeof folder === 'string' ) {
                        folders[j] = {
                            path: folder,
                            isSelected: (j === 0)
                        };

                    // data is laid out right, so we just skip the rest of the work
                    // and return the data.
                    } else if ( folder.path === undefined ) {
                        if ( folder.folder === undefined ) {
                            fail( "'.c4.save.json' has gotten corrupted." );
                        }

                        folder.path = folder.folder;

                    } else {
                        return data;
                    }
                }
            }
        }

        return data;
    }

    var readObjFromFile = function( path ) {
        var file = null;

        try {
            if ( FILE_SYSTEM.FileExists(path) ) {
                file = FILE_SYSTEM.OpenTextFile(path, 1, false, -1);
            } else {
                return null;
            }

            if ( file ) {
                var data = file.ReadAll();
                file.Close();
                file = null;

                return JSON.parse( data );
            } else {
                return null;
            }
        } catch ( ex ) {
            try {
                if ( file ) {
                    file.Close();
                    file = null;
                }
            } catch ( ex ) { }

            return null;
        }
    }

    var writeObjToFile = function( path, data ) {
        try { 
            var file = FILE_SYSTEM.CreateTextFile(path, true, true);
            file.Write( JSON.stringify(data, undefined, 4) );
            file.Close();
        } catch ( ex ) {
            // in case it was an issue with writing
            // just try to ensure it's closed, if we can
            if ( file ) {
                try {
                    file.Close();
                } catch ( ex ) { }
            }

            alert( "failed to save to, " + path );
        }
    }



    /// 
    ///         Public Interface
    /// 
    
    /**
     *
     */
    c4.extColor = function( ext, color ) {
        extensionColours[ getExtension(ext) ] = color;

        return this;
    }

    /**
     * For when file extensions do not make sense, you can also set a
     * colour for specific filenames. For example 'makefile'.
     *
     * File name colour takes precidence over file extension colour.
     * So you can also set colours for specific files to be coloured
     * differently; i.e. for 'index.html', 'site.css', 'stdafx.h', and
     * so on.
     *
     * @param name The name of the file.
     * @param color The CSS colour value to set.
     */
    c4.fileNameColor = function( name, color ) {
        fileNameColours[ name ] = color;

        return this;
    }

    c4.defaultFolder = function(path) {
        if ( FILE_SYSTEM.FolderExists(path) ) {
            defaultFolder = path;
        }

        return this;
    }

    c4.loadUserJSFile = function() {
        var userJSFile = USER_HOME + "\\" + ".c4.js";

        if ( FILE_SYSTEM.FileExists(userJSFile) ) {
            var script = bb.script({ src: userJSFile });

            document.getElementsByTagName('head')[0].appendChild( script );
        }

        return this;
    }

    c4.saveFile = function( path ) {
        if ( arguments.length === 0 ) {
            return saveFile;
        } else {
            saveFile = path;
            return this;
        }
    }

    c4.start = function() {
        // start her up!
        window.onload = function() {
            // load data, normalize the data (in case we made some changes to the format),
            // or set the data to a default set of data.
            var saveData = updateSaveDataFormat(
                    readObjFromFile( saveFile )
            ) || [ newDefaultProject() ]
                        
            var theEnvironment = newEnvironment( window, saveData );
            document.body.appendChild( theEnvironment );
            
            var helpInfo = new c4.core.HelpOverlay();
            document.body.appendChild( helpInfo.getDom() );

            bb.attr( document.body, {
                preventDefault: [ 'keypress TAB', 'keydown TAB', 'keyup TAB' ],

                'keydown TAB': helpInfo.method('show'),
                'keyup   TAB': helpInfo.method('hide')
            } );
        };

        return this;
    }

    c4.openWith = function( extension, app, altApp ) {
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
})();

