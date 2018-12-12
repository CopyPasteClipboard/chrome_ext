/* CONTENT
 * Content script for CLIPPY chrome extension
 * Receives message from background script when pasting from the
 * context menu occurs in order to paste into the page's selected field.
*/

// always track the element that has been right-clicked
var rightClicked = null;
document.addEventListener('mousedown', function(event) {
    if (event.button == 2) {
        // a right click has occurred
        rightClicked = event.target;
    }
}, true);

// inform background script to update context menu
function updateMenu() {
    chrome.runtime.sendMessage({ request: 'update' });
}
  
// constantly refresh menu in the case that mouse is stationary on an element
// for a long period of time
var refreshTime = 2000; // in ms
setInterval(updateMenu, refreshTime);

// receive message from background.js for pasting into editable element
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == 'paste') {
        rightClicked.value = request.msg; // paste
    }
 });

