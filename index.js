"use strict"; // Enforces strict mode, which helps catch common coding errors and unsafe actions

const fs = require("fs"); // Import the file system module to interact with the file system
const bencode = require("bencode"); // Import the bencode module to encode and decode bencoded data
const tracker = require("./tracker"); // Import the tracker module to interact with the tracker
const torrentParser = require("./torrent-parser"); // Import the torrent-parser module to parse the torrent file

const torrent = torrentParser.open("puppy.torrent"); // Decode the torrent file into a JavaScript object

tracker.getPeers(torrent, (peers) => {
  console.log("list of peers: ", peers);
});
