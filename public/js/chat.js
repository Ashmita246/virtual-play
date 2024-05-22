const socket = io();

// Elements
const $messageForm = document.querySelector("#userForm");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.getElementById("send-location");
// const $videoSelect = document.getElementById("videoSelect");
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
let videoSharing = false;

const autoscroll = () => {
  // New message element
  const $newMessage = $messages.lastElementChild;

  // Height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible Height
  const visibleHeight = $messages.offsetHeight;

  // Height of messages container
  const containerHeight = $messages.scrollHeight;

  // How far have i scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};
const videoPlayers = {};

function getLastVideoElement() {
  const videos = $messages.querySelectorAll('.video');
  return videos[videos.length - 1]; // Return the last video element
}

function getYouTubeVideoID(url) {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);
    return searchParams.get('v') || urlObj.pathname.split('/').pop();
  } catch (error) {
    console.error("Invalid URL:", url, error);
    return null;
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
  const videoId = getYouTubeVideoID(message.videoUrl);
  if (!videoId) {
    console.error("Invalid video URL received:", message.videoUrl);
    return;
  }

  const html = Mustache.render(videoMessageTemplate, {
    username: message.username,
    platform: 'YouTube', // Set the platform to 'YouTube'
    videoId,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
  attachVideoEventListeners(); // Attach event listeners to the new video
});


function attachVideoEventListeners() {
  const videos = document.querySelectorAll('.video');

  videos.forEach(video => {
    video.addEventListener('play', () => {
      videos.forEach(otherVideo => {
        if (otherVideo !== video) {
          otherVideo.pause();
        }
      });
    });

    video.addEventListener('error', () => {
      console.error(`Failed to load video: ${video.currentSrc}`);
    });
  });
}

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

$messageForm.addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent form submission
  // disable
  $messageFormButton.setAttribute("disabled", "true");

  const message = document.getElementById("userInput").value;
  socket.emit("sendMessage", message, (err) => {
    // enable
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
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute("disabled");
        console.log("Location shared.");
      }
    );
  });
});

// Update the $sendVideoButton event listener to handle sending the selected video
// Update the $sendVideoButton event listener to handle sending the selected video


// Populate the video select options with the two videos
// const availableVideos = ["music-video.mp4", "videoplayback.mp4","blankSpace.mp4","closer.mp4","https://youtu.be/sRW9FvAZ3_w?si=bClgCHBLdnZqGg3c"];
// updateVideoSelectOptions(availableVideos);

// function updateVideoSelectOptions(videos) {
//   $videoSelect.innerHTML = '<option value="" disabled selected>Select a video</option>';
//   videos.forEach((videoUrl, index) => {
//     const option = document.createElement("option");
//     option.value = videoUrl;
//     option.textContent = `Video ${index + 1}`;
//     $videoSelect.appendChild(option);
//   });
// }

$sendVideoButton.addEventListener("click", () => {
  const videoUrl = $videoUrlInput.value.trim();

  if (videoUrl === "") {
    alert("Please enter a video URL.");
    return;
  }

  try {
    new URL(videoUrl); // Validate URL
  } catch (e) {
    alert("Invalid URL. Please enter a valid video URL.");
    return;
  }

  const videoId = getYouTubeVideoID(videoUrl);
  if (!videoId) {
    alert("Invalid YouTube video URL.");
    return;
  }

  socket.emit("sendVideo", { videoUrl, platform: 'YouTube' }, (error) => {
    if (error) {
      return alert(error);
    }
    console.log("Video sent to the server.");
    $videoUrlInput.value = "";
  });
});

// Listener events on button click
$playButton.addEventListener("click", () => {
  const video = getLastVideoElement();
  if (!video) return;

  const videoPaused = video.paused;
  socket.emit("playVideo", { videoPaused }, (ack) => {
    console.log("Acknowledgement from server:", ack);
    console.log("something something", video);
  });
});


$forwardButton.addEventListener("click", () => {
  const video = getLastVideoElement();
  if (!video) return;

  socket.emit("forwardVideo");
});

$backwardButton.addEventListener("click", () => {
  const video = getLastVideoElement();
  if (!video) return;

  socket.emit("backwardVideo");
});

socket.on("forwardVideo", () => {
  const video = getLastVideoElement();
  if (video) {
    video.currentTime += 10;
  }
});

socket.on("backwardVideo", () => {
 
  const video = getLastVideoElement();
  if (video) {
    video.currentTime -= 10;
  }
});

socket.on("playVideo", ({ videoPaused }) => {
  const video = getLastVideoElement();
  if (video) {
    if (videoPaused) {
      video.play();
      $playButton.textContent = "Pause";
    } else {
      video.pause();
      $playButton.textContent = "Play";
    }
  }
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    location.href = "/";
    alert(error);
  }
});
