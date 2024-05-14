const express = require('express');
const http = require('http');
require('dotenv').config()

const app = express()
const server = http.createServer(app);
const port= process.env.PORT

server.listen(port, () => {
    console.log(`Server listening on ${port}`);
  });
  