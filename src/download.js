"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const message = require("./message");
const pieces = require("./pieces");



module.exports = (torrent) => {
    // Get the list of peers from the tracker
    tracker.getPeers(torrent, (peers) => {
        const pieces = new Pieces(torrent.info.pieces.length / 20);
        // For each peer, initiate the download
        peers.forEach((peer) => download(peer, torrent, pieces));
    });
};

function download(peer) {
    const socket = net.Socket();
    socket.on("error", console.log);
    socket.connect(peer.port, peer.ip, () => {
        // Once connected to the peer, write data to the socket
        socket.write(message.buildHandshake(torrent));
    });

    const queue = [];
    // Call the `onWholeMsg` function passing the `socket` and a callback function
    // The callback function will handle the received message by calling `msgHandler` with the message and the socket
    onWholeMsg(socket, (msg) => msgHandler(msg, socket, pieces, queue));
}

// This function handles the received message and performs actions based on its content
function msgHandler(msg, socket) {
    // Check if the received message is a handshake
    if (isHandshake(msg)) {
        // If it is a handshake, send an 'interested' message to the peer
        socket.write(message.buildInterested());
    } else {
        const m = message.parse(msg);

        if (m.id === 0) chokeHandler(socket);
        if (m.id === 1) unchokeHandler(socket, pieces, queue);
        if (m.id === 4) haveHandler(m.payload);
        if (m.id === 5) bitfieldHandler(m.payload);
        if (m.id === 7) pieceHandler(m.payload);
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

module.exports.parse = (msg) => {
    // Extract the message ID from the received message
    const id = msg.length > 4 ? msg.readUInt8(4) : null;
    // Initialize the payload variable
    let payload = msg.length > 5 ? msg.slice(5) : null;
    // Check if the message ID corresponds to a 'piece', 'cancel', or 'request' message
    if (id === 6 || id === 7 || id === 8) {
        // Parse the payload for 'piece', 'cancel', or 'request' messages
        payload = {
            index: payload.readInt32BE(0),
            begin: payload.readInt32BE(4),
        };
    }
    // Assign the 'block' or 'length' property to the payload based on the message ID
    payload[id === 7 ? "block" : "length"] = rest;

    // Return the parsed message object
    return {
        size: msg.readInt32BE(0),
        id: id,
        payload: payload,
    };
};

function chokeHandler() {
    socket.end();
}

function unchokeHandler(socket,pieces,queue) {
    queue.choked = false;
    requestPiece(socket,pieces,queue);
}

function haveHandler(payload) {
    // Extract the piece index from the payload
    const pieceIndex = payload.readInt32BE(0);
    // Add the piece index to the queue
    queue.push(pieceIndex);
    // If the piece has not been requested yet, send a request message to the peer
    if (!requested[pieceIndex]) {
        socket.write(message.buildRequest(...));
    }
    // Mark the piece as requested
    requested[pieceIndex] = true;

    // If the queue has only one piece, initiate the request for that piece
    if (queue.length === 1) {
        requestPiece(socket, request, queue);
    }
}

function bitfieldHandler(payload) {
    //...
}

function pieceHandler(payload) {
    //...
}

function requestPiece(socket, pieces, queue) {
    if (queue.choked) return null;
   while (queue.queue.length) {
     const pieceIndex = queue.shift();
     if (pieces.needed(pieceIndex)) {
         socket.write(message.buildRequest(pieceIndex));
         pieces.addRequested(pieceIndex);
         break;
     }
   }
}
