const express = require("express");
const app = express();
const https = require("https");
const os = require("os");
// const fs = require("fs");
const { Server } = require("socket.io");

// // SSL
// const sslOptions = {
//   key: fs.readFileSync("./server-ssl-key.pem"),
//   cert: fs.readFileSync("./server-ssl.pem"),
// };

// Create HTTPS Express Server
const expressServer = https.createServer(app);

// Create Socket Server
const io = new Server(expressServer, {
  cors: {
    origin: "*",
  },
});

// Current Network Address
const ipAddress = Object.values(os.networkInterfaces())[0][1].address;
const port = process.env.PORT || 3001;

// Storing each user's location data
let locationData = {};

// socket connection
io.on("connection", (socket) => {
  console.log(`New User Connected ${socket.id}`);

  socket.emit("connected", "Socket Connected Successfully");

  socket.on("send-location", (data) => {
    console.log(data);

    // If the user is new, then s/he will show other users on map first then show itself.
    if (
      Object.keys(locationData).find((item) => item === data.userID) ===
      undefined
    ) {
      io.emit("others-location", locationData);
    }

    locationData[socket.id] = data;

    // Broadcast the received location to all
    io.emit("receive-location", locationData[socket.id]);
  });

  // socket disconnect
  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);

    // When an user is disconnected, then delete its location information
    delete locationData[socket.id];
    // Also, tell other connected users to remove their location marker from the map.
    io.emit("remove-marker", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send(`Server is running at https://${ipAddress}:${port}`);
});

expressServer.listen(port, () => {
  console.log(`Server is running at https://${ipAddress}:${port}`);
});
