"use strict";

const fs = require("fs");
const bencode = require("bencode");
const crypto = require("crypto");

module.exports.open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

// Calculate the size of the torrent
module.exports.size = (torrent) => {
  const size = torrent.info.files
    ? torrent.info.files.map((file) => file.length).reduce((a, b) => a + b) // If the torrent has multiple files, sum up their lengths
    : torrent.info.length; // If the torrent has a single file, use its length

  return BigInt.toBuffer(size, { size: 8 }); // Convert the size to a buffer
};

module.exports.infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};
