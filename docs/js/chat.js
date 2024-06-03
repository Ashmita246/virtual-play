// const socket = io('https://virtualplay.netlify.app',{transport:['websockets']});
const socket = io();
// const peer = new Peer();
// Elements
const $messageForm = document.querySelector("#userForm");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.getElementById("send-location");
const $videoUrlInput = document.querySelector("#video-url-input");
const $sendVideoButton = document.querySelector("#send-video-button");
const $videoContainer = document.getElementById("videoContainer");
const $messages = document.querySelector("#messages");
const $playButton = document.getElementById("play-button");
const $pauseButton = document.getElementById("pause-button");
const $forwardButton = document.getElementById("forward-button");
const $backwardButton = document.getElementById("backward-button");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector("#location-message-template").innerHTML;
const videoMessageTemplate = document.querySelector("#video-message-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// const localVideo = document.createElement('video');
// const remoteVideo = document.createElement('video');
// localVideo.autoplay = true;
// remoteVideo.autoplay= true;
// document.getElementById('videoContainer').append(localVideo, remoteVideo);


// const peerConnectionConfig = {
//   'iceServers': [
//     { 'urls': 'stun:stun.l.google.com:19302' }
//   ]
// };

// let localStream;
// let peerConnection;

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
let globalPlayer ;

function onYouTubeIframeAPIReady() {
  // Placeholder function for YouTube IFrame API readiness
}

function createYouTubePlayer(videoId) {
  return new YT.Player(`youtube-player-${videoId}`, {
    height: '250',
    width: '350',
    videoId: videoId,
    playerVars:{
      'controls': 0, // Hide the default controls
            'disablekb': 1, // Disable keyboard controls
            'iv_load_policy': 3, // Disable video annotations
            'modestbranding': 1, // Hide YouTube logo
            'playsinline': 1, // Play inline on mobile devices
            'autoplay': 0 // Disable autoplay
            // 'enablejsapi': 1 
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}


function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING) {
    currentPlayer = event.target; // Update the current player instance
    updatePlayPauseButton(YT.PlayerState.PLAYING); // Update the play/pause button to show "Pause"
  } else if (event.data == YT.PlayerState.PAUSED) {
    currentPlayer = event.target; // Update the current player instance
    updatePlayPauseButton(YT.PlayerState.PAUSED); // Update the play/pause button to show "Play"
  }
}

function updatePlayPauseButtons(state) {
  if (state === YT.PlayerState.PLAYING) {
    $playButton.style.display = "none";
    $pauseButton.style.display = "inline-block";
  } else {
    $playButton.style.display = "inline-block";
    $pauseButton.style.display = "none";
  }
}

function onPlayerReady(event) {
  globalPlayer = event.target;
  updatePlayPauseButtons(globalPlayer.getPlayerState());
  
  //  Overlay an invisible element to prevent interaction with the video player
   const iframe = globalPlayer.getIframe();
   const playerContainer = iframe.parentElement;
   playerContainer.style.position='relative';
   const overlay = document.createElement('div');
   overlay.style.position = 'absolute';
   overlay.style.top = 0;
   overlay.style.left = 0;
   overlay.style.width = '100%';
   overlay.style.height = '100%';
   overlay.style.zIndex = 1; // Make sure it's on top of the player
   overlay.style.backgroundColor='transparent';
   playerContainer.appendChild(overlay);

   overlay.addEventListener('click',(e)=>{
    e.stopPropagation();
    // globalPlayer.playVideo();
    // globalPlayer.pauseVideo();
   })
  //  overlay.addEventListener('mousemove', (e) => {
  //   e.stopPropagation(); // Stop the event from bubbling up
  //   e.preventDefault(); // Prevent the default behavior of the event
  // });
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

const sendVideoUrl = () => {
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
};

$videoUrlInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    sendVideoUrl();
  }
});

$sendVideoButton.addEventListener("click", sendVideoUrl);
// $sendVideoButton.addEventListener("click", () => {
//   const videoUrl = $videoUrlInput.value.trim();

//   if (videoUrl === "") {
//     alert("Please enter a video URL.");
//     return;
//   }

//   try {
//     new URL(videoUrl);
//   } catch (e) {
//     alert("Invalid URL. Please enter a valid video URL.");
//     return;
//   }

//   const videoId = getYouTubeVideoID(videoUrl);
//   if (!videoId) {
//     alert("Invalid YouTube video URL.");
//     return;
//   }

//   socket.emit("sendVideo", videoUrl, (error) => {
//     if (error) {
//       return alert(error);
//     }
//     console.log("Video sent to the server.");
//     $videoUrlInput.value = "";
//   });
// });

$playButton.addEventListener('click', () => {
  if (globalPlayer) {
    const currentTime = globalPlayer.getCurrentTime();
    socket.emit('playVideo', currentTime);
  }
});

$pauseButton.addEventListener('click', () => {
  if (globalPlayer) {
    const currentTime = globalPlayer.getCurrentTime();
    socket.emit('pauseVideo', currentTime);
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
    updatePlayPauseButtons(YT.PlayerState.PLAYING);
  }
});

socket.on('pauseVideo', ({ currentTime }) => {
  if (globalPlayer) {
    globalPlayer.seekTo(currentTime);
    globalPlayer.pauseVideo();
    updatePlayPauseButtons(YT.PlayerState.PAUSED);
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

// navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//   .then(stream => {
//     localStream = stream;
//     localVideo.srcObject = stream;
//   })
//   .catch(error => console.error('Error accessing media devices.', error));

// document.getElementById('startVideoCall').addEventListener('click', () => {
//   startCall();
// });

// document.getElementById('endVideoCall').addEventListener('click', () => {
//   endCall();
// });

// function startCall() {
//   peerConnection = new RTCPeerConnection(peerConnectionConfig);
//   peerConnection.onicecandidate = handleIceCandidate;
//   peerConnection.ontrack = handleRemoteStream;
//   localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  
//   peerConnection.createOffer()
//     .then(offer => {
//       return peerConnection.setLocalDescription(offer);
//     })
//     .then(() => {
//       socket.emit('offer', peerConnection.localDescription);
//     })
//     .catch(error => console.error('Error creating offer:', error));
// }

// function handleIceCandidate(event) {
//   if (event.candidate) {
//     socket.emit('ice-candidate', event.candidate);
//   }
// }

// function handleRemoteStream(event) {
//   remoteVideo.srcObject = event.streams[0];
// }

// socket.on('offer', (offer) => {
//   if (!peerConnection) {
//     startCall();
//   }
//   peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
//     .then(() => {
//       return peerConnection.createAnswer();
//     })
//     .then(answer => {
//       return peerConnection.setLocalDescription(answer);
//     })
//     .then(() => {
//       socket.emit('answer', peerConnection.localDescription);
//     })
//     .catch(error => console.error('Error handling offer:', error));
// });

// socket.on('answer', (answer) => {
//   peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
// });

// socket.on('ice-candidate', (candidate) => {
//   peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
// });

// function endCall() {
//   peerConnection.close();
//   peerConnection = null;
//   remoteVideo.srcObject = null;
// }

socket.emit("join", { username, room }, (error) => {
  if (error) {
    location.href = "/";
    alert(error);
  }
});
