/* BACKGROUND
 * Background Script for CLIPPY Chrome Extension
 * Sets up user credential collection and the context menu system
 */

// all routes through here
var aws_url_base = 'http://54.162.248.95:4000/';

// persist user's CLIPPY username in chrome storage
function setUser(user) {
    var postUrl = `${aws_url_base}v1/login`;
    var content = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({'username': user})
    };
    fetch(postUrl, content)
        .then(res => res.json())
        .then(data => {
            console.log(data);
            chrome.storage.sync.set({userId: data['id']}, function() {
                console.log('Stored userId set to: ' + data['id']);
            });
        })
        .catch(err => console.log(err));
}

// persist user's CLIPPY password in chrome storage
function setPass(pass) {
    chrome.storage.sync.set({password: pass}, function() {
        console.log('Password stored!');
    });
}

// copy clipped into the global clipboard specified by board
function sendToClipboard(clipped, boardId) {
    console.log(`Sending ${clipped} to board w id ${boardId}`);
    var item = {'board_item': clipped};
    var postUrl = `v1/clipboard/${boardId.split('_')[0]}/boarditem`

    fetch(`${aws_url_base}${postUrl}`,{
        method : 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body : JSON.stringify(item)
    }).then(res => res.json()).then(data => console.log(data)).catch(err => console.log(err));
}

// get the contents of the board specified by boardId from the global clipboard
// returns a Promise of the HTTPS request to receive this resource
function getFromClipboard(boardId) {
    var getUrl = `v1/clipboard/${boardId}?type=mostRecent`;
    console.log(`getting from ${aws_url_base}${getUrl}`);
    return fetch(`${aws_url_base}${getUrl}`)
        .then(resp => resp.json());
}


// paste into the webpage
function paste(info, tab, to_paste) {
    var message = { type: 'paste', msg: to_paste };
    chrome.tabs.sendMessage(tab.id, message, function(clicked) {
        console.log(`Pasted ${to_paste} onto the page`);
    });
}

// creates the parent menus for copying and pasting
function generateRootMenus() {
    chrome.contextMenus.create({
        title: 'Copy onto CLIPPY',
        id: 'root-copy',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        title: 'Paste into CLIPPY',
        id: 'root-paste',
        contexts: ['editable']
    });
}
        
// given all user clipboards from the global server,
// generate the appropriate menus to appear on right-click
function generateMenus() {
    // check for the race condition caused by repeated 
    // updates overwriting eachother
    if (chrome.runtime.lastError) {
        console.log('DAMN YOU, RACE CONDITION');
    }
    // remove all menus for a clean slate
    chrome.contextMenus.removeAll();

    // create parent menus
    generateRootMenus();

    // return all the user's clipboards on the global server
    // returned in format: [ [<board-name>, <board-id>], ...]
    chrome.storage.sync.get('userId', item => {
        var getUrl = `v1/user/${item.userId}/clipboards`;
        console.log(`${aws_url_base}${getUrl}`);
        fetch(`${aws_url_base}${getUrl}`, {
            method : 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        })
        // get the response in a readable format
        .then(resp => resp.json())
        .then(clipboards => {
            for (clipboard of clipboards) {
                // clipboard to be shown on copy
                    chrome.contextMenus.create({
                        title: clipboard['board_name'],
                        id: clipboard['id'] + '_copy',
                        parentId: 'root-copy',
                        contexts: ['selection']
                    });

                    // clipboard to see on paste
                    chrome.contextMenus.create({
                        title: clipboard['board_name'],
                        id: clipboard['id'] + '_paste',
                        parentId: 'root-paste',
                        contexts: ['editable']
                    });
            }

        }).catch(err => console.log(err));
    });

    needsUpdate = true;
}

// add events to occurr on extension installation
chrome.runtime.onInstalled.addListener(function() {
    // get user's CLIPPY credentials
    alert('It appears you\'ve never used the CLIPPY extension before.');
    username = prompt('Please enter a registered CLIPPY user', 'paper');
    password = prompt('Please enter the associated password', 'clip');
    setUser(username);
    setPass(password);

    // set actions for when context menu clicked
    chrome.contextMenus.onClicked.addListener(function(info, tab) {
        var id = info.menuItemId;
        var parentId = info.parentMenuItemId;
        if (parentId === 'root-copy') {
            console.log(`${info.selectionText} copied`);
            sendToClipboard(info.selectionText, id);
        } else if (parentId == 'root-paste') {
            getFromClipboard(id.split('_')[0]).then(item => {
                var toPaste = item[0].text_content;
                var message = { type: 'paste', msg: toPaste };
                chrome.tabs.sendMessage(tab.id, message, function(clicked) {
                    console.log(`Received item ${toPaste}`);
                });
            });
        } else if (parentId == undefined) {
            // user has clicked on the parent menus. choose their default (if it exists)
            chrome.storage.sync.get('default', item => {
                if (item.default) {
                    console.log('Def is: ' + def); 
                }
            });
        }
    });
});

var needsUpdate = true;
// listen to the content script for when the context menus need to be updated
chrome.runtime.onMessage.addListener(function(msg, sender, response) {
        if (msg.request === 'update' && needsUpdate) {
            needsUpdate = false;
            generateMenus();
        }
});
