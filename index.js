/*
get_data() returns an array that contains the words in the input box
String -> List of String

*/

// ENVIRONMENT OPTIONS
let ENV__GHPAGES = encodeURI("https://medwardson.github.io/SpotifySentences/");
let ENV__LOCALHOST = encodeURI("http://localhost:8000/");

// CURRENT ENV (changeable)
let ENV = ENV__LOCALHOST;

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
get_longest_title(words, access_token, max_len) loops through the list of words to find the longest song title
possible up to max len, and proceeds to return the uri as well as the index of the item both inside an array.

[listof String], Token, Natural Num -> anyof false, [Natural Num, Track Uri (Str)]

*/

async function get_longest_title(words, access_token, max_len) {
  var longest_index = 0;
  var counter = 0;
  var longest_uri = "";
  while (counter < max_len) {
    query = "";
    for (i = 0; i <= counter; i++) {
      if (i == 0) {
        query += words[i];
      } else {
        query += " " + words[i];
      }
    }
    song_data = await search_song(access_token, query);
    if (song_data == false) {
      counter++;
      continue;
    }
    if (song_data[0].toLowerCase() == query.toLowerCase()) {
      longest_index = counter;
      longest_uri = song_data[1];
    }
    counter++;
  }
  if (longest_uri === "") {
    return false;
  }
  return [longest_index, longest_uri];
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

/*
get_song_uris(access_token, words) takes the access token for calls to the api and the list of words and cycles through get_longest_title()
to get the uri's and store them in song_uris, then returns an array of the uri's.

Token [Str] -> [Song Uris]
*/

async function get_song_uris(access_token, words) {
  let song_uris = [];
  while (words.length != 0) {
    next_song = await get_longest_title(
      words,
      access_token,
      Math.min(words.length, 7)
    );
    if (next_song === false) {
      alert("You have chosen an invalid sentence.");
      return false;
    }
    song_uris.push(next_song[1]);
    words = words.splice(next_song[0] + 1, words.length);
  }
  return song_uris;
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
  console.log(playlist_id);
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

/*
Main is the function run upon clicking the submit button.
*/

async function main() {
  let access_token = await window.localStorage.getItem("access_token");
  let words = get_data(document.getElementById("sentence").value);
  let title = document.getElementById("playlist-title").value;

  // Greedy Algorithm :
  let song_uris = await get_song_uris(access_token, words);
  if (song_uris === false) {
    return "Invalid sentence";
  }
  playlist = await make_playlist(access_token, title);
  playlist_id = playlist[0];
  playlist_url = playlist[1];
  await add_songs(playlist_id, song_uris, access_token);
  display_result(playlist_url);
}
