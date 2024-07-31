"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");

module.exports = (torrent) => {
  // Get the list of peers from the tracker
  tracker.getPeers(torrent, (peers) => {
    // For each peer, initiate the download
    peers.forEach(download);
  });
};

function download(peer) {
  const socket = net.Socket();
  socket.on("error", console.log);
  socket.connect(peer.port, peer.ip, () => {
    // Once connected to the peer, write data to the socket
    // socket.write(...)
  });
  onWholeMsg(socket, (data) => {
    // handle response here
  });
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
