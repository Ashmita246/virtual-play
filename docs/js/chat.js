// const socket = io('https://virtualplay.netlify.app',{transport:['websockets']});
const socket = io();

// Elements
const $messageForm = document.querySelector("#userForm");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.getElementById("send-location");
const $videoUrlInput = document.querySelector("#video-url-input");
const $sendVideoButton = document.querySelector("#send-video");
const $videoContainer = document.getElementById("videoContainer");
const $messages = document.querySelector("#messages");
const $playButton = document.getElementById("play-button");
const $forwardButton = document.getElementById("forward-button");
const $backwardButton = document.getElementById("backward-button");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector("#location-message-template").innerHTML;
const videoMessageTemplate = document.querySelector("#video-message-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

let currentPlayer = null; // Store the current YouTube player instance

const autoscroll = () => {
  const $newMessage = $messages.lastElementChild;
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
  const visibleHeight = $messages.offsetHeight;
  const containerHeight = $messages.scrollHeight;
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

function getYouTubeVideoID(url) {
  if (!url) {
    console.error("URL is undefined or empty:", url);
    return null;
  }
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);
    return searchParams.get('v') || urlObj.pathname.split('/').pop();
  } catch (error) {
    console.error("Invalid URL:", url, error);
    return null;
  }
}
let globalPlayer = null;

function onYouTubeIframeAPIReady() {
  // Placeholder function for YouTube IFrame API readiness
}

function createYouTubePlayer(videoId) {
  return new YT.Player(`youtube-player-${videoId}`, {
    height: '315',
    width: '560',
    videoId: videoId,
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
globalPlayer = event.target;
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.PLAYING) {
    currentPlayer = event.target; // Update the current player instance
  }
}

socket.on("message", (message) => {
  console.log(message);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationMessage", (message) => {
  console.log("link: ", message);
  const html = Mustache.render(locationMessageTemplate, {
    username: message.username,
    url: message.url,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on('videoMessage', (message) => {
  console.log("videoMessage: ", message);

  const getUrl= message.videos
  
  if (!getUrl) {
    console.error("Received message with undefined or empty videoUrl:", message);
    return;
  }
  
  const videoId = getYouTubeVideoID(getUrl);
  if (!videoId) {
    console.error("Invalid video URL received:", getUrl);
    return;
  }
  
  const isYouTube = message.platform === "YouTube";
  
  const html = Mustache.render(videoMessageTemplate, {
    username: message.username,
    platform: message.platform,
    isYouTube,
    videoId,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
  
  if (isYouTube) {
    createYouTubePlayer(videoId);
  }
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

$messageForm.addEventListener("submit", function (event) {
  event.preventDefault();
  $messageFormButton.setAttribute("disabled", "true");
  const message = document.getElementById("userInput").value;
  socket.emit("sendMessage", message, (err) => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();

    if (err) {
      return console.log(err);
    }
    console.log("The message was sent.");
  });
});

$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser.");
  }

  $sendLocationButton.setAttribute("disabled", "true");

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit("sendLocation", {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }, () => {
      $sendLocationButton.removeAttribute("disabled");
      console.log("Location shared.");
    });
  });
});

$sendVideoButton.addEventListener("click", () => {
  const videoUrl = $videoUrlInput.value.trim();

  if (videoUrl === "") {
    alert("Please enter a video URL.");
    return;
  }

  try {
    new URL(videoUrl);
  } catch (e) {
    alert("Invalid URL. Please enter a valid video URL.");
    return;
  }

  const videoId = getYouTubeVideoID(videoUrl);
  if (!videoId) {
    alert("Invalid YouTube video URL.");
    return;
  }

  socket.emit("sendVideo", videoUrl, (error) => {
    if (error) {
      return alert(error);
    }
    console.log("Video sent to the server.");
    $videoUrlInput.value = "";
  });
});

$playButton.addEventListener('click', () => {
    if (globalPlayer) {
        const currentTime = globalPlayer.getCurrentTime();
        const state = globalPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            socket.emit('pauseVideo', currentTime);
        } else {
            socket.emit('playVideo', currentTime);
        }
    }
});

$forwardButton.addEventListener('click', () => {
    if (globalPlayer) {
        const currentTime = globalPlayer.getCurrentTime();
        socket.emit('forwardVideo', currentTime);
    }
});

$backwardButton.addEventListener('click', () => {
    if (globalPlayer) {
        const currentTime = globalPlayer.getCurrentTime();
        socket.emit('backwardVideo', currentTime);
    }
});

socket.on('playVideo', ({ currentTime }) => {
    if (globalPlayer) {
        globalPlayer.seekTo(currentTime);
        globalPlayer.playVideo();
    }
});

socket.on('pauseVideo', ({ currentTime }) => {
    if (globalPlayer) {
        globalPlayer.seekTo(currentTime);
        globalPlayer.pauseVideo();
    }
});

socket.on('forwardVideo', ({ currentTime }) => {
    if (globalPlayer) {
        globalPlayer.seekTo(currentTime + 10);
    }
});

socket.on('backwardVideo', ({ currentTime }) => {
    if (globalPlayer) {
        globalPlayer.seekTo(currentTime - 10);
    }
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    location.href = "/";
    alert(error);
  }
});
