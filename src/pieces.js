const tp = require("./torrent-parser");

("use strict");

module.exports = class {
  constructor(torrent) {
    // Function to build the pieces array
    function buildPiecesArray() {
      // Calculating the number of pieces
      const nPieces = torrent.info.pieces.length / 20;
      // Creating an array with null values
      const arr = new Array(nPieces).fill(null);
      // Mapping over the array and creating sub-arrays with false values
      return arr.map((_, i) =>
        new Array(tp.blocksPerPiece(torrent, i)).fill(false)
      );
    }

    // Initializing the requested and received arrays
    this._requested = buildPiecesArray();
    this._received = buildPiecesArray();
  }

  // Method to add a requested piece block
  addRequested(pieceBlock) {
    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    this._requested[pieceBlock.index][blockIndex] = true;
  }

  // Method to add a received piece block
  addReceived(pieceBlock) {
    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    this._received[pieceBlock.index][blockIndex] = true;
  }

  // Method to check if a piece block is needed
  needed(pieceBlock) {
    // Checking if all blocks have been requested
    if (this._requested.every((blocks) => blocks.every((i) => i))) {
      // Resetting the requested array to the received array
      this._requested = this._received.map((blocks) => blocks.slice());
    }
    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    // Checking if the piece block is needed
    return !this._requested[pieceBlock.index][blockIndex];
  }

  // Method to check if all pieces have been received
  isDone() {
    return this._received.every((blocks) => blocks.every((i) => i));
  }
};
