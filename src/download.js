"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const message = require("./message");

module.exports = (torrent) => {
  // Get the list of peers from the tracker
  tracker.getPeers(torrent, (peers) => {
    // For each peer, initiate the download
    peers.forEach((peer) => download(peer, torrent));
  });
};

function download(peer) {
  const socket = net.Socket();
  socket.on("error", console.log);
  socket.connect(peer.port, peer.ip, () => {
    // Once connected to the peer, write data to the socket
    socket.write(message.buildHandshake(torrent));
  });

  // Call the `onWholeMsg` function passing the `socket` and a callback function
  // The callback function will handle the received message by calling `msgHandler` with the message and the socket
  onWholeMsg(socket, (msg) => msgHandler(msg, socket));
}

// This function handles the received message and performs actions based on its content
function msgHandler(msg, socket) {
    // Check if the received message is a handshake
    if (isHandshake(msg)) {
        // If it is a handshake, send an 'interested' message to the peer
        socket.write(message.buildInterested());
    }
}

// This function checks if the received message is a handshake
function isHandshake(msg) {
    // Check if the length of the message matches the expected length for a handshake
    // and if the message starts with the string 'BitTorrent protocol'
    return (
        msg.length === msg.readUInt8(0) + 49 &&
        msg.toString("utf8", 1) === "BitTorrent protocol"
    );
}

// This function handles receiving data from the socket and processing it as complete messages
function onWholeMsg(socket, callback) {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on("data", (recvBuf) => {
    // Calculate the length of a whole message
    const msgLen = () =>
      handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    // Process complete messages in the buffer
    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      // Pass the complete message to the callback function
      callback(savedBuf.slice(0, msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
}
