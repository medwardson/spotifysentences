/*
get_data() returns an array that contains the words in the input box
String -> List of String

*/

let ENV__GHPAGES = encodeURI("https://medwardson.github.io/spotifysentences/");
let ENV__LOCALHOST = encodeURI("http://localhost:8000/");
let ENV__MOBILE = encodeURI("http://192.168.0.67:8000/");

// CURRENT ENV (changeable)
let ENV = ENV__GHPAGES;

function get_data(sentence) {
  return sentence
    .split(" ")
    .map((word) => {
      if (
        (word.slice(-1) == ".") |
        (word.slice(-1) == ",") |
        (word.slice(-1) == "!") |
        (word.slice(-1) == "?")
      ) {
        return word.substring(0, word.length - 1);
      } else {
        return word;
      }
    })
    .filter((word) => word.length > 0);
}

/*
login_check() is a function called onload to see if the user has logged into spotify. If they have,
it will call the login() function. Otherwise, it will only display the login button.
*/
function login_check() {
  const query = new URLSearchParams(window.location.hash.substr(1));
  let access_token = query.get("access_token");
  // ?product=shirt&color=blue&newuser&size=m
  // get the code if it exists
  // if it doesn't exist, only show the login button.
  if (access_token == null) {
    document.getElementById("myProgress").style.display = "none";
    document.getElementById("info").style.display = "block";
    document.getElementById("info").innerHTML =
      "Welcome to SpotifySentences, please login to continue.";
    document.getElementById("login").style.display = "block";
    document.getElementById("reset").style.display = "none";
    document.getElementById("username").style.display = "none";
    document.getElementById("input").style.display = "none";
    document.getElementById("playlist-url").style.display = "none";
  } else {
    login(access_token);
  }
}

/*
login() changes the interface to allow the user to enter their desired sentence to be
converted to a playlist, and retrieves the access token.
*/
function login(access_token) {
  window.localStorage.setItem("access_token", access_token);

  // Get user info
  fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      window.localStorage.setItem("user_id", data.id);
      document.getElementById("myProgress").style.display = "none";
      document.getElementById("info").style.display = "block";
      document.getElementById("info").innerHTML =
        "SpotifySentences will convert the sentence you enter below into a playlist who's song names spell out the sentence. Please fill out the information below.";
      document.getElementById("reset").style.display = "none";
      document.getElementById("playlist-url").style.display = "none";
      document.getElementById("login").style.display = "none";
      document.getElementById("username").style.display = "block";
      document.getElementById("input").style.display = "block";
      document.getElementById(
        "username"
      ).innerHTML = `Logged in: ${data.display_name}`;
    });
}

/*
spotify_login() redirects the user to the spotify login portal.
*/

function spotify_login() {
  window.location = `https://accounts.spotify.com/en/authorize?client_id=d814e2c0db1c41ec848479f3876900c4&redirect_uri=${ENV}&response_type=token&scope=playlist-modify-public`;
}

/*
search_song(token,songname) takes the access token and a song name and returns an array
containing the song name and it's uri.

Token, Str -> anyof false, [Track Name, Track Uri]
*/

async function search_song(access_token, songname) {
  song_index = await get_song_index(songname, access_token);
  if (song_index === false) {
    return false;
  }
  return fetch(
    "https://api.spotify.com/v1/search" +
      `?q=${songname}` +
      "&type=track&limit=50",
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => {
      return [
        data.tracks.items[song_index].name,
        data.tracks.items[song_index].uri,
      ];
    });
}

/*
get_song_index(songname, token) finds the first index occurence up to the 50th search value 
for which we get an exact word match as the title, and returns the index.

Str Token -> anyof false, Nat
*/

async function get_song_index(songname, token) {
  let count = 0;
  return fetch(
    "https://api.spotify.com/v1/search" +
      `?q=${songname}` +
      "&type=track&limit=50",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.tracks.items.length == 0) {
        return false;
      }
      for (i = 0; i < data.tracks.items.length; i++) {
        if (songname.toLowerCase() == data.tracks.items[i].name.toLowerCase()) {
          return count;
        }
        count++;
      }
      return false;
    });
}

/**
 *
 * @param {Str} access_token
 * @param {Str} title
 * make_playlist(access_token, title) creates the playlist and then returns the playlist id.
 */

async function make_playlist(access_token, title) {
  let user_id = window.localStorage.getItem("user_id");
  return fetch(`https://api.spotify.com/v1/users/${user_id}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: title,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      return [data.id, data.external_urls.spotify];
    });
}
/**
 *
 * @param {Str} playlist_id
 * @param {Array} song_uris
 * @param {Str} access_token
 *
 * add_songs uses the song_uris to add the tracks to the playlist.
 */

async function add_songs(playlist_id, song_uris, access_token) {
  fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uris: song_uris,
    }),
  });
  window.localStorage.removeItem("playlist_id");
}

function display_result(playlist_url) {
  document.getElementById("myProgress").style.display = "none";
  document.getElementById("info").style.display = "none";
  document.getElementById("login").style.display = "none";
  document.getElementById("username").style.display = "none";
  document.getElementById("input").style.display = "none";
  document.getElementById("sentence").value = "";
  document.getElementById("playlist-title").value = "";
  let html_playlist = document.getElementById("playlist-url");
  html_playlist.innerHTML = `Playlist Generated: <a style="color:white;" target="_blank" href="${playlist_url}"> Click here</a>`;
  html_playlist.href = `${playlist_url}`;
  html_playlist.style.display = "block";
  document.getElementById("reset").style.display = "block";
}

async function get_song_uris(access_token, words) {
  let song_uris = [];
  var elem = document.getElementById("myBar");
  var width = 1;
  let progress = 0;

  for (let i = 0; i < words.length; i++) {
    // for (word of words) {
    // let i = words.findIndex((query) => query === word);
    for (let j = i; j >= 0; j--) {
      let query = words.slice(j, i + 1).join(" ");
      let song_data = await search_song(access_token, query);
      console.log(song_uris);
      console.log(query, song_data[0], song_data[1]);
      if (song_data === false) {
        song_uris[i] = [];
      } else if (j === 0) {
        song_uris[i] = [song_data[1]];
      } else if (song_uris[j - 1].length !== 0) {
        song_uris[i] = [...song_uris[j - 1], song_data[1]];
        break;
      }
    }
    if (width >= 100) {
      progress = 0;
    } else {
      width += 100 / words.length;
      elem.style.width = width + "%";
      elem.innerHTML = Math.round(Math.min(100, width)) + "%";
    }
  }
  return song_uris.pop();
}

function progress() {
  document.getElementById("myProgress").style.display = "block";
  document.getElementById("info").style.display = "none";
  document.getElementById("reset").style.display = "none";
  document.getElementById("playlist-url").style.display = "none";
  document.getElementById("login").style.display = "none";
  document.getElementById("username").style.display = "none";
  document.getElementById("input").style.display = "none";
}

function invalid_query() {
  document.getElementById("sentence").value = "";
  document.getElementById("playlist-title").value = "";
  login_check();
  alert("Invalid Sentence");
}

/*
Main is the function run upon clicking the submit button.
*/

async function main() {
  progress();
  let access_token = await window.localStorage.getItem("access_token");
  let words = get_data(document.getElementById("sentence").value);
  let title = document.getElementById("playlist-title").value;
  get_song_uris(access_token, words);
  let song_uris = await get_song_uris(access_token, words);
  console.log(song_uris);
  if (song_uris.length === 0) {
    invalid_query();
    return false;
  }
  playlist = await make_playlist(access_token, title);
  playlist_id = playlist[0];
  playlist_url = playlist[1];
  await add_songs(playlist_id, song_uris, access_token);
  display_result(playlist_url);
  return false;
}
