"use strict";

const tp = require("./torrent-parser");

// Define a class for the queue
module.exports = class {
    constructor(torrent) {
        this._torrent = torrent;
        this._queue = [];
        this.choked = true;
    }

    // Add a piece to the queue
    // Add a piece to the queue
    queue(pieceIndex) {
        // Calculate the number of blocks in the piece
        const nBlocks = tp.blocksPerPiece(this._torrent, pieceIndex).length;

        // Iterate over each block in the piece
        for (let i = 0; i < nBlocks; i++) {
            // Create a piece block object with the index, begin, and length
            const pieceBlock = {
                index: pieceIndex,
                begin: i * tp.BLOCK_LEN,
                length: this.blockLen(this._torrent, pieceIndex, i),
            };

            // Push the piece block to the queue
            this._queue.push(pieceBlock);
        }
    }

    // Remove and return the first piece from the queue
    deque() {
        return this._queue.shift();
    }

    // Return the first piece in the queue without removing it
    peek() {
        return this._queue[0];
    }

    // Return the length of the queue
    length() {
        return this._queue.length;
    }
};
