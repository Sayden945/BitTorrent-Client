"use strict";

const dgram = require("dgram");
const Buffer = require("buffer").Buffer;
const urlParse = require("url").parse;
const crypto = require("crypto");
const torrentParser = require("./torrent-parser");
const util = require("./util");

module.exports.getPeers = (torrent, callback) => {
  const socket = dgram.createSocket("udp4");
  const url = urlParse(torrent.announce.toString("utf8"));

  // Send connect request
  udpSend(socket, buildConnReq(), url);

  socket.on('message', response => {
    if (respType(response) === 'connect') {
      // receive and parse connect response
      const connResp = parseConnResp(response);
      // send announce request
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      udpSend(socket, announceReq, url);
    } else if (respType(response) === 'announce') {
      // parse announce response
      const announceResp = parseAnnounceResp(response);
      // pass peers to callback
      callback(announceResp.peers);
    }
  });
};

function udpSend(socket, message, rawUrl, callback = () => []) {
  const url = urlParse(rawUrl);
  socket.send(message, 0, message.length, url.port, url.host, callback);
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return "connect";
  if (action === 1) return "announce";
}

function buildConnReq() {
  const buf = Buffer.alloc(16); // Allocate 16 byte buffer

  // connection id
  buf.writeUInt32BE(0x417, 0); // 0x417: connection id offset 0 bytes
  buf.writeUInt32BE(0x27101980, 4); // 0x27101980: magic constant offset 4 bytes
  // action
  buf.writeUInt32BE(0, 8); // connect action offset 8 bytes
  // transaction id
  crypto.randomBytes(4).copy(buf, 12); // transaction id offset 12 bytes

  return buf;
}

function parseConnResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8),
  };
}

function buildAnnounceReq(connId, torrent, port = 6885) {
  const buf = buffer.allocUnsafe(98);

  // Connection id
  connId.copy(buf, 0);
  // action
  buf.writeUInt32BE(1, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  // info hash
  torrentParser.infoHash(torrent).copy(buf, 16);
  // peerId
  util.genId().copy(buf, 36);
  // downloaded
  Buffer.alloc(8).copy(buf, 56);
  // left
  buffer.alloc(8).copy(buf, 64);
  // uploaded
  Buffer.alloc(8).copy(buf, 72);
  // event
  buf.writeUInt32BE(0, 80);
  // ip address
  buf.writeUInt32BE(0, 84);
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // number want
  buf.writeInt32BE(-1, 92);
  // port
  buf.writeUInt16BE(port, 96);

  return buf;
}

function parseAnnounceResp(resp) {
  // Function to group an iterable into groups of a specified size
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  return {
    // Parse the action field from the response
    action: resp.readUInt32BE(0),
    // Parse the transactionId field from the response
    transactionId: resp.readUInt32BE(4),
    // Parse the leechers field from the response
    leechers: resp.readUInt32BE(8),
    // Parse the seeders field from the response
    seeders: resp.readUInt32BE(12),
    // Parse the peers field from the response
    peers: group(resp.slice(20), 6).map((address) => {
      return {
        // Extract the IP address from the address field
        ip: address.slice(0, 4).join("."),
        // Extract the port number from the address field
        port: address.readUInt16BE(4),
      };
    }),
  };
}
