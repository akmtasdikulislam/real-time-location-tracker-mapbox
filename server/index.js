const express = require("express");
const app = express();
const https = require("https");
const { Server } = require("socket.io");

// Create HTTPS Express Server
const expressServer = https.createServer(app);

// Create Socket Server
const io = new Server(expressServer, {
  cors: {
    origin: "*",
  },
});

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
  res.send(`Server is running`);
});

const port = process.env.PORT || 3001;

expressServer.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
