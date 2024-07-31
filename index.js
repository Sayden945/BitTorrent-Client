"use strict"; // Enforces strict mode, which helps catch common coding errors and unsafe actions

const download = require("./src/download"); // Import the download module to download the file
const torrentParser = require("./src/torrent-parser"); // Import the torrent-parser module to parse the torrent file
const fs = require("fs"); // Import the file system module to interact with the file system
const tracker = require("./src/tracker"); // Import the tracker module to interact with the tracker

const torrent = torrentParser.open(process.argv[2]); // Decode the torrent file into a JavaScript object

download(torrent); // Download the file specified in the torrent

tracker.getPeers(torrent, (peers) => {
  console.log("list of peers: ", peers);
});
