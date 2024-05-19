const path = require("path");
const fs = require('fs');
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
  generateVideoMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");
let videoSharing=false;

io.on("connection", (socket) => {
  console.log("New web socket connection");

  socket.on("join", (options, callback) => {
    const user = addUser({ id: socket.id, ...options });

    if (user.error) {
      return callback(user.error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome !!"));

    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined the room`)
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("sendLocation", (cords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${cords.latitude},${cords.longitude}`
      )
    );
    callback();
  });

  // socket.on("sendVideo", (callback) => {
  //   const user = getUser(socket.id)
  //   if(videoSharing){
  //     socket.emit("videoSharingError","A video is already being shared");
  //   }
  //   else{
  //   console.log("video sent.");
  //   videoSharing=true; //set the videosharing flag to true
  //   io.to(user.room).emit("videoMessage", generateVideoMessage(user.username));
  //   io.to(user.room).emit("videoStarted");
  //   callback();
  //   }
    
  // });

  socket.on("sendVideo", (videoDataOrUrls, callback) => {
    const user = getUser(socket.id);
  
    const message = {
      username: user.username,
      createdAt: new Date().getTime(),
    };
  
    // Determine if videoDataOrUrls is a single video data or an array of video URLs
    if (typeof videoDataOrUrls === 'string') {
      // Single video data
      message.videoData = videoDataOrUrls;
    } else if (Array.isArray(videoDataOrUrls)) {
      // Array of video URLs
      message.videos = videoDataOrUrls;
    } else {
      // Invalid data
      return callback("Invalid video data");
    }
  
    io.to(user.room).emit('videoMessage', message);
    callback();
  });
  
  // play and pause event on the specific room
  socket.on("playVideo", ({ videoPaused }, callback) => {
    console.log("playVideo event received");

    io.sockets.sockets.forEach((socket) => {
      const user = getUser(socket.id);
      io.to(user.room).emit("playVideo", { videoPaused });
    });

    callback();
  });

// forwardVideo event from client
socket.on("forwardVideo", () => {
  console.log("server forwarding");
  const user = getUser(socket.id);
  io.to(user.room).emit("forwardVideo"); 
});

// backwardVideo event from client
socket.on("backwardVideo", () => {
  const user = getUser(socket.id);
  io.to(user.room).emit("backwardVideo"); 
});


  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left!`)
      );

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });

      if(videoSharing){
        videoSharing = false;
        io.to(user.room).emit("videoEnded");
      }
    }
  });

  

  socket.on('videoEnded',()=>{
    $sendVideoButton.setAttribute('disabled');
  })
});

app.use(express.static(publicDirectoryPath));

server.listen(port, () => {
  console.log("Server is running on port " + port);
});
