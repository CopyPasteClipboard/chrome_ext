/* Background Script for CLIPPY Chrome Extension
 * Sets up user credential collection and the context menu system
 * Author: Keaton Ufheil
 */

// all routes through here
var aws_url_base = 'http://34.224.86.78:8080/';

// persist user's CLIPPY username in chrome storage
function setUser(user) {
    chrome.storage.sync.set({userId: user}, function() {
        console.log('Stored username set to: ' + user);
    });
}

// persist user's CLIPPY password in chrome storage
function setPass(pass) {
    chrome.storage.sync.set({password: pass}, function() {
        console.log('Stored password set to: ' + pass);
    });
}

// copy clipped into the global clipboard specified by board
function sendToMain(clipped, boardId) {
    var item = {'new_item': clipped};
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
function getFromMain(boardId) {
    var getUrl = `v1/clipboard/${boardId}?type=mostRecent||type=all`;
    console.log(`getting from ${aws_url_base}${getUrl}`);
    return fetch(`${aws_url_base}${getUrl}`)
        .then(resp => resp.json());
}


// paste into the webpage
function paste(info, tab, to_paste) {
    var message = { type: 'paste', msg: to_paste };
    chrome.tabs.sendMessage(tab.id, message, function(clicked) {
        // do nothing for now
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
    console.log(needsUpdate);
    // remove all menus for a clean slate
    chrome.contextMenus.removeAll();

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

            // check for the race condition caused by repeated 
            // updates overwriting eachother
            if (chrome.runtime.lastError) {
                console.log('DAMN YOU, RACE CONDITION');
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
            sendToMain(info.selectionText, id);
        } else if (parentId == 'root-paste') {
            getFromMain(id.split('_')[0]).then(item => {
                var toPaste = item[0].text_content;
                var message = { type: 'paste', msg: toPaste };
                chrome.tabs.sendMessage(tab.id, message, function(clicked) {
                    console.log(`Received item ${toPaste}`);
                });
            });
        } else if (parentId == undefined) {
            // user has clicked on the parent menus. choose their default (if it exists)
            let getDefault = chrome.storage.sync.get('default');
            getDefault.then(def => {
                if (def) {
                    console.log('Def is: ' + def);
                }    
            });
        }
    });
});

var needsUpdate = true;

chrome.runtime.onMessage.addListener(function(msg, sender, response) {
        console.log('generate');
        if (msg.request === 'update' && needsUpdate) {
            console.log('needs update is: ' + needsUpdate);
            needsUpdate = false;
            generateMenus();
        }
});
