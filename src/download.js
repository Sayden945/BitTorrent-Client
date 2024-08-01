"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const message = require("./message");
const pieces = require("./pieces");
const Queue = require("./queue");

module.exports = (torrent, path) => {
  // Get the list of peers from the tracker
  tracker.getPeers(torrent, (peers) => {
    const pieces = new Pieces(torrent);
    const file = fs.openSyc(path, "w");
    // For each peer, initiate the download
    peers.forEach((peer) => download(peer, torrent, pieces, file));
  });
};

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

function download(peer) {
  const socket = net.Socket();
  socket.on("error", console.log);
  socket.connect(peer.port, peer.ip, () => {
    // Once connected to the peer, write data to the socket
    socket.write(message.buildHandshake(torrent));
  });

  const queue = new Queue(torrent);
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

function chokeHandler() {
  socket.end();
}

function unchokeHandler(socket, pieces, queue) {
  queue.choked = false;
  requestPiece(socket, pieces, queue);
}

// This function handles the 'have' message received from the peer
function haveHandler(socket, pieces, queue, payload) {
  // Extract the piece index from the payload
  const pieceIndex = payload.readInt32BE(0);

  // Check if the queue is empty
  const queueEmpty = queue.length === 0;

  // Queue the piece index
  queue.queue(pieceIndex);

  // If the queue was empty, request a piece from the peer
  if (queueEmpty) {
    requestPiece(socket, pieces, queue);
  }
}

// This function handles the 'bitfield' message received from the peer
function bitfieldHandler(payload) {
  const queueEmpty = queue.length === 0;
  // Iterate through each byte in the payload
  payload.forEach((byte, i) => {
    // Iterate through each bit in the byte
    for (let j = 0; j < 8; j++) {
      // Check if the bit is set to 1
      if (byte % 2) {
        // Calculate the piece index and enqueue it
        queue.queue(i * 8 + 7 - j);
      }
      // Shift the bits to the right by 1
      byte = Math.floor(byte / 2);
    }
  });
  if (queueEmpty) requestPiece(socket, pieces, queue);
}

// This function handles the 'piece' message received from the peer
function pieceHandler(socket, pieces, queue, torrent, pieceResp) {
  console.log(pieceResp);
  // Add the received piece to the list of received pieces
  pieces.addReceived(pieceResp);

  const offset =
    pieceResp.index * torrent.info["piece length"] + pieceResp.begin;
  fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {});

  // Check if all the pieces have been downloaded
  if (pieces.isDone()) {
    // If all the pieces have been downloaded, close the socket and log a completion message
    socket.end();
    console.log("Download is complete");
  } else {
    // If there are still pieces remaining, request the next piece from the peer
    requestPiece(socket, pieces, queue);
  }
}

// This function is responsible for requesting a piece from the peer
function requestPiece(socket, pieces, queue) {
  // If the peer is choked, do not send any requests
  if (queue.choked) return null;

  // Iterate through the queue until a needed piece is found
  while (queue.length) {
    // Dequeue a piece block from the queue
    const pieceBlock = queue.deque();

    // Check if the piece block is needed
    if (pieces.needed(pieceBlock)) {
      // If the piece block is needed, send a request message to the peer
      socket.write(message.buildRequest(pieceBlock));
      // Add the piece block to the requested list
      pieces.addRequested(pieceBlock);
      // Break the loop after sending the request
      break;
    }
  }
}
