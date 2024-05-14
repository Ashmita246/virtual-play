const express = require('express');
const http = require('http');

const app = express()
const server = http.createServer(app);

server.listen(4000, () => {
    console.log('Server listening on 4000');
  });
  