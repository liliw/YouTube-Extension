'use strict';

// function declaration

/* Validate the access token received on the query string. */
function saveToken(token) {
  console.log("token received: ", token);
  chrome.storage.local.set({token: token});
  console.log("token saved");
  // getToken();

}

function getToken() {
  chrome.storage.local.get(['token'], function(result) {
    console.log('Value currently is ' + result.token);
    // return result.token;
    if (result.token === undefined || Object.keys(result.token).length === 0) {
      oauth2SignIn();
    }
    else {
      console.log("get the token from local storage");
      return retrievePlayLists(result.token);
    }
  });
}

function RefreshToken(token) {
  chrome.identity.removeCachedAuthToken({token: token});
  console.log("RefreshToken");
  chrome.identity.getAuthToken({interactive: true}, function(new_token) {
    console.log("new Token:", new_token);
    saveToken(new_token); // save token in local storage
  });
}

function retrievePlayLists(token) {
  if (token !== undefined ) {

    // refresh the user's token
    // RefreshToken(token);

    var retry = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET',
             'https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&' +
             'access_token=' + token);

    //xhr.onreadystatechange = function (e) {
      //console.log("xhr.response: ", xhr.response);
    //}


    //xhr.setRequestHeader('Authorization','Bearer ' + token);


    xhr.onload = function () {
      console.log("hi");
      if (this.status === 401 && retry) {
        // This status may indicate that the cached access token was invalid.
        // Retry once with a fresh token.

        retry = false;

        chrome.identity.removeCachedAuthToken({'token': token}, oauth2SignIn()); // remove invalid token nd signin again
        return;

      }
      console.log(this.response);
      return this.response;
    }

    xhr.send(null);

  }
}

function oauth2SignIn() {

  chrome.identity.getAuthToken({interactive: true}, function(token) {

    console.log("token: ", token);
    if (token !== undefined && Object.keys(token).length !== 0) {
      saveToken(token); // save token in local storage FixMe: It is unsafe without encoding user token
      return token;

      retrievePlayLists(token);
    }
  });

}


function playLists(playlist) {
  console.log("playlist: ", playlist);
}



// Start from here:

window.onload = function() {
  document.querySelector('button').addEventListener('click', function() {

    var result = getToken();

    if (result !== undefined && result !== null) {
      playLists(result);
    }

  });
};
