const socket = io();

//Elements
const $messageForm = document.querySelector("#userForm");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.getElementById("send-location");
const $sendVideoButton = document.getElementById("send-video");
const $videoContainer = document.getElementById("videoContainer");
const $messages = document.querySelector("#messages");
const $playButton = document.getElementById("play-button");
const $forwardButton = document.getElementById("forward-button");
const $backwardButton = document.getElementById("backward-button");

//Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector(
  "#location-message-template"
).innerHTML;
const videoMessageTemplate = document.querySelector(
  "#video-message-template"
).innerHTML;

const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

//options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  //New message element
  const $newMessage = $messages.lastElementChild;

  //Height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt($newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  //Visible Height
  const visibleHeight = $messages.offsetHeight;

  //Height of messages container
  const containerHeight = $messages.scrollHeight;

  //How far have i scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

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

socket.on("videoMessage", (message) => {
  console.log("link: ", message);
  const html = Mustache.render(videoMessageTemplate, {
    username: message.username,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

$messageForm.addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent form submission
  //disable
  $messageFormButton.setAttribute("disabled", "true");

  const message = document.getElementById("userInput").value;
  socket.emit("sendMessage", message, (err) => {
    //enable
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
    return alert("Geolocation is  not supported by your browser..");
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
        console.log("Location shared..");
      }
    );
  });
});

$sendVideoButton.addEventListener("click", () => {
  $sendVideoButton.setAttribute("disabled", "true");
  socket.emit("sendVideo", () => {
    // $sendVideoButton.removeAttribute("disabled");
    console.log("Video shared..");
  });
});

// listener events on button click
$playButton.addEventListener("click", () => {
  const $video = document.getElementById("video");
  const videoPaused = $video.paused;
  // if ($video.play) {
  //   videoPaused = false;
  // }
  socket.emit("playVideo", { videoPaused }, () => {});
});


$forwardButton.addEventListener("click", () => {
  console.log("button clicked");
  socket.emit("forwardVideo");
});

 $backwardButton.addEventListener("click", () => {
  socket.emit("backwardVideo");
});

 socket.on("forwardVideo", () => {
  const $video = document.getElementById("video");
  $video.currentTime += 10; 
});

 socket.on("backwardVideo", () => {
  const $video = document.getElementById("video");
  $video.currentTime -= 10;  
});


// event from the server
socket.on("playVideo", ({ videoPaused }) => {
  const $video = document.getElementById("video");
  if (videoPaused ) {
    $video.play();
    $playButton.textContent = "Pause";
  } else {
    $video.pause();
    $playButton.textContent = "Play";
  }
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    location.href = "/";
    alert(error);
  }
});
