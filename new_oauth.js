'use strict';

var gPlayLists;
var gToken;
var tag = document.createElement('script');
var gNowPlaying = false;

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


function getToken() {
  chrome.storage.local.get('token', function(result) {
    console.log("result", result['token']);
    var access_token = result['token'];
    if (access_token === undefined || Object.keys(access_token).length === 0) {
      console.log("no token is saved");
      oauth2SignIn();
      return ;
    }

    return retrievePlayLists(access_token);

  });
}


function oauth2SignIn() {
  chrome.identity.getAuthToken({interactive: true}, function(token) {
    if (chrome.runtime.lastError) {
      callback(chrome.runtime.lastError);
      return;
    }
    else if (token !== undefined && Object.keys(token).length !== 0) {

      chrome.storage.local.set({'token': token});
      console.log("token saved");
      retrievePlayLists(token);
      return;
    }

    console.log("error!");
    return -1;
  });

}


function retrievePlayLists(token) {
  gToken = token;
    var retry = true;

    var xhr = new XMLHttpRequest();
    xhr.open('GET',
             'https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&' +
             'access_token=' + token);

    xhr.onload = function () {
      if (this.status === 401 && retry) {
        // This status may indicate that the cached access token was invalid.
        // Retry once with a fresh token.

        retry = false;
        chrome.identity.removeCachedAuthToken({'token': token}, function() {
          console.log("login again");
          oauth2SignIn();
        }); // remove invalid token and signin again
        return;
      }
      showPlayLists(this.response);
      return ;
    }

    xhr.send(null);
}


function showPlayLists(playlists) {
  var new_playlists = JSON.parse(playlists);
  gPlayLists = new_playlists;
  console.log("gPlayLists: ", gPlayLists);

  var all_titles = "";
  for (var i = 2; i < new_playlists["items"].length; i++ ) {
    var title = new_playlists['items'][i]['snippet']['title'];
    all_titles = all_titles + "<input type=\"button\" id=\"" + new_playlists['items'][i]['id'] + "\" value=\"" + title + "\"/>";
  }

  document.getElementById("playLists").innerHTML = all_titles;
}

var player;
function onYouTubeIframeAPIReady(playlist_id) {
  if (playlist_id) {
    console.log("play this: ", playlist_id);
    player = new YT.Player('player', {
      height: '390',
      width: '640',
      playerVars:
      {
        list: playlist_id,
        listType:'playlist',
      },
      events: {
        'onReady': onPlayerReady,
        'onError': onError // Callback when onError fires
      }
    });
  }
}

function onPlayerReady(event) {
  event.target.playVideo();
}


// Start from here:

window.onload = function() {
  document.querySelector('button').addEventListener('click', function() {
    //Once click the button: fist, getAuthToken, then pass the access token back, next send the token to retrievePlayLists,
    //returning playlist then show it on screen

    var result = getToken();

  });

  document.addEventListener('click', function(e) {
    console.log("playlist id: ", e.target.id);
    if (e.target.id !== 'authorize') {
      if( !gNowPlaying ) {
        gNowPlaying = true;
        onYouTubeIframeAPIReady(e.target.id);
      }
      else {
        player.loadPlaylist({
          'list': e.target.id,
          'listType': 'playlist'});
      }
    }
  });

};


// Log any errors
function onError(event) {
    var error = "undefined";
    console.log("event:", event);
    switch (event.data) {
        case 2:
            error = "Invalid parameter value";
            break;
        case 5:
            error = "HTML 5 related error";
            break;
        case 100:
            error = "Video requested is not found";
            break;
        case 101:
            error = "Embedded playback forbidden by ownder";
            break;
        case 150:
            error = "Error processing video request";
            break;
        default:
            error = "unknown (" + event.data + ")";
    }
    console.log ("onError: " + error);
}
