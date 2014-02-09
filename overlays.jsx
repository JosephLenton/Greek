
===============================================================================

# Overlay

This is a class for building an overlay, and giving a means to display it.

===============================================================================

    var withOverlay = function( title, callback ) {
        var overlay = document.createElement( 'div' );

        overlay.className = 'overlay-back';
        overlay.innerHTML = '
                <div class="overlay-box>
                    <div class="overlay-title"></div>
                    <div class="overlay-content"></div>
                </div>
        ';

        var titleDom = overlay.querySelector( '.overlay-title' );
        var contentDom = overlay.querySelector('.overlay-content');

        withOverlay = function(title, callback) {
            titleDom.textContent = title;
            contentDom.innerHTML = '';
            callback( overlay, contentDom );
        }

        withOverlay( title, callback );
    }



-------------------------------------------------------------------------------

# showPrompt title text callback fail

-------------------------------------------------------------------------------

    var showPrompt = function(title, text, callback, fail) {
        withOverlay( title, function(overlay, dom) {
            bb.append( dom, {
                    '.overlay-box-text': { text: text },

                    'a.overlay-button .yes': {
                        text: 'confirm',
                        click: hideOverlay.curry( overlay ).thenMaybe( fail );
                    },

                    'a.overlay-button .no': {
                        text: 'cancel',
                        click: hideOverlay.curry( overlay ).thenMaybe( fail );
                    }
            });

            showOverlay( overlay );
        });
    }



-------------------------------------------------------------------------------

### showConfirm title text callback fail

-------------------------------------------------------------------------------

    var showConfirm = function(title, text, callback, fail) {
        withOverlay( title, function(overlay, dom) {
            bb.append( dom, {
                    '.overlay-box-text': { text: text },

                    'a.overlay-button .yes': {
                        text: 'yes',
                        click: hideOverlay.curry( overlay ).thenMaybe( callback )
                    },

                    'a.overlay-button .no': {
                        text: 'no',
                        click: hideOverlay.curry( overlay ).thenMaybe( fail )
                    }
            });

            showOverlay( overlay );
        });
    }

    var showOverlay = bb.addClass.curry( _, 'show' );
    var hideOverlay = bb.removeClass.curry( _, 'show' );

    window.overlay = {
        withOverlay: withOverlay,
        showPrompt: showPrompt,
        showConfirm: showConfirm
    }



