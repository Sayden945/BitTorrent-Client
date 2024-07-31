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
    socket.on("data", (data) => {
        // Handle the response data received from the peer
    });
}
