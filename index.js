"use strict"; // Enforces strict mode, which helps catch common coding errors and unsafe actions

const fs = require("fs"); // Import the file system module to interact with the file system
const bencode = require("bencode"); // Import the bencode module to encode and decode bencoded data

const torrent = bencode.decode(fs.readFileSync("puppy.torrent")); // Synchronously read the content of the file 'puppy.torrent'
console.log(torrent.announce.toString("utf8")); // Convert the file content to a UTF-8 string and log it to the console
