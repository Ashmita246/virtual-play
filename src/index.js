const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocationMessage, generateVideoMessage } = require("./utils/messages");
const { getPlatformType, getYouTubeVideoID } = require('./utils/platformUtils');
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");
const cors = require('cors');

const app = express();
const server = http.createServer(app);


// const {ExpressPeerServer}= require('peer');

// const peerServer = ExpressPeerServer(server,{
//  debug: true, 
// });

// app.use('/peerjs',peerServer);

// const io = socketio(server,{
//   transport:['websockets']
// });
const io = socketio(server);

const port =3000;

app.use(cors());

app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist/'));

const publicDirectoryPath = path.join(__dirname, "../docs");

app.use(express.static(publicDirectoryPath));

const supportedPlatforms = ['YouTube'];

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

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback();
  });

  socket.on('sendVideo', (videoUrl, callback) => {
    const user = getUser(socket.id);
    const platform = getPlatformType(videoUrl);

    if (!supportedPlatforms.includes(platform)) {
      return callback(`Platform ${platform} is not supported.`);
    }

    const videoId = getYouTubeVideoID(videoUrl);
    if (!videoId) {
      return callback("Invalid video URL.");
    }

    const videoMessage = generateVideoMessage(user.username, videoUrl, platform);

    io.to(user.room).emit('videoMessage', videoMessage);

    callback();
  });

  socket.on('playVideo', (currentTime) => {
    const user = getUser(socket.id);
    io.to(user.room).emit('playVideo', { currentTime });
});

socket.on('pauseVideo', (currentTime) => {
    const user = getUser(socket.id);
    io.to(user.room).emit('pauseVideo', { currentTime });
});

socket.on('forwardVideo', (currentTime) => {
    const user = getUser(socket.id);
    io.to(user.room).emit('forwardVideo', { currentTime });
});

socket.on('backwardVideo', (currentTime) => {
    const user = getUser(socket.id);
    io.to(user.room).emit('backwardVideo', { currentTime });
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
    }
  });
//    // WebRTC signaling handlers
//    socket.on('offer', (offer) => {
//     const user = getUser(socket.id);
//     socket.broadcast.to(user.room).emit('offer', offer);
// });

// socket.on('answer', (answer) => {
//     const user = getUser(socket.id);
//     socket.broadcast.to(user.room).emit('answer', answer);
// });

// socket.on('ice-candidate', (candidate) => {
//     const user = getUser(socket.id);
//     socket.broadcast.to(user.room).emit('ice-candidate', candidate);
// });
});

server.listen(port, () => {
  console.log("Server is running on port " + port);
});
