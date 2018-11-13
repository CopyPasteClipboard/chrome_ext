/* Content script for CLIPPY chrome extension
* Receives message from background script when pasting from the
* context menu occurs in order to paste into the page's selected field.
*/

var rightClicked = null;

document.addEventLsitener('mousedown', function(event) {
    if (event.button == 2) {
        // a right click has occurred
        rightClicked = event.target;
    }
}, true);

// receive message from background.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    rightClicked.value += request; // paste
});
