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

module.exports.BLOCK_LEN = Math.pow(2, 14); // 16KB

// Calculate the length of a specific piece in the torrent
module.exports.pieceLen = (torrent, pieceIndex) => {
  const totalLength = BigInt.fromBuffer(this.size(torrent)).toNumber(); // Get the total length of the torrent
  const pieceLength = torrent.info["piece length"]; // Get the length of each piece in the torrent

  const lastPieceLength = totalLength % pieceLength; // Calculate the length of the last piece
  const lastPieceIndex = Math.floor(totalLength / pieceLength); // Calculate the index of the last piece

  // If the current piece is the last piece, return its length. Otherwise, return the standard piece length.
  return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
};

// Calculate the number of blocks per piece in the torrent
module.exports.blocksPerPiece = (torrent, pieceIndex) => {
  const pieceLength = this.pieceLen(torrent, pieceIndex); // Get the length of the current piece
  return Math.ceil(pieceLength / this.BLOCK_LEN); // Divide the piece length by the block length and round up to the nearest whole number
};

// Calculate the length of a specific block in the torrent
module.exports.blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = this.pieceLen(torrent, pieceIndex); // Get the length of the current piece
  const lastPieceLength = pieceLength % this.BLOCK_LEN; // Calculate the length of the last block in the piece
  const lastPieceIndex = Math.floor(pieceLength / this.BLOCK_LEN); // Calculate the index of the last block in the piece

  // If the current block is the last block in the piece, return its length. Otherwise, return the standard block length.
  return blockIndex === lastPieceIndex ? lastPieceLength : this.BLOCK_LEN;
};
