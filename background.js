/* Background Script for CLIPPY Chrome Extension
 * Sets up user credential collection and the context menu system
 * Author: Keaton Ufheil
 */

// all routes through here
var aws_url_base = 'http://ec2-54-173-123-45.compute-1.amazonaws.com:8080/';

// persist user's CLIPPY username in chrome storage
function setUser(user) {
    chrome.storage.sync.set({username: user}, function() {
        console.log('Stored username set to: ' + user);
    });
}

// persist user's CLIPPY password in chrome storage
function setPass(pass) {
    chrome.storage.sync.set({password: pass}, function() {
        console.log('Stored password set to: ' + pass);
    });
}

// send the selection to the main clipboard on AWS
function sendToMain(clipped) {
    var item = { 'item': clipped};

    fetch(`${aws_url_base}user/bailersp/clipboard`,{
        method : "POST",
        headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
        body : JSON.stringify(item)
    }).then(res => res.json()).then(data => console.log(data)).catch(err => console.log(err));
}

// get the clipboard from AWS
function getFromMain() {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4) {
            console.log('received ' + xmlHttp.responseText);
            window.getSelection().innerHTML = 'zeal';
        }
    }

    chrome.storage.sync.get('username', function(result) {
        var final_url = aws_url_base + 'user/' + result.username + '/clipboard';
        console.log('Sending to: ' + final_url);
        xmlHttp.open("GET", final_url, true);
        xmlHttp.send(null);//JSON.stringify(item));
    });
}


// paste into the webpage
function paste(info, tab, to_paste) {
    var message = { type: 'paste', msg: to_paste };
    chrome.tabs.sendMessage(tab.id, message, function(clicked) {
        // do nothing for now
    });
}

function getClipboards() {
    return ['work', 'frivolous'];
}

// fetch current menus from AWS to dynamically generate them before user right-clicks
function generateMenus() {
    var clipboards = getClipboards();

    for (clipboard of clipboards) {
        // clipboard to be shown on copy
        chrome.contextMenus.create({
            title: clipboard,
            id: clipboard + '_copy',
            parentId: 'root-copy',
            contexts: ['selection']
        });

        // clipboard to see on paste
        chrome.contextMenus.create({
            title: clipboard,
            id: clipboard + '_paste',
            parentId: 'root-paste',
            contexts: ['editable']
        });
    }
}


// add events to occurr on extension installation
chrome.runtime.onInstalled.addListener(function() {
    // get user's CLIPPY credentials
    alert('It appears you\'ve never used the CLIPPY extension before.');
    username = prompt('Please enter a registered CLIPPY user', 'paper');
    password = prompt('Please enter the associated password', 'clip');
    setUser(username);
    setPass(password);

    // setup top-level context menus

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

    // set actions for when context menu clicked
    chrome.contextMenus.onClicked.addListener(function(info, tab) {
        var id = info.menuItemId;
        var parentId = info.parentMenuItemId;
        if (parentId === 'root-copy') {
            console.log('Copied to main');//sendToMain(info.selectionText);
        } else if (parentId == 'root-paste') {
            var to_paste = 'eel';//getFromMain();
            console.log('Pasted from main');//paste(info, tab, to_paste);           
        }
    });

    generateMenus();    
});

