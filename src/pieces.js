"use strict";

// Define a class for managing pieces
module.exports = class {
    // Constructor to initialize the requested and received arrays
    constructor(size) {
        this.requested = new Array(size).fill(false);
        this.received = new Array(size).fill(false);
    }

    // Method to mark a piece as requested
    addRequested(pieceIndex) {
        this.requested[pieceIndex] = true;
    }

    // Method to mark a piece as received
    addReceived(pieceIndex) {
        this.received[pieceIndex] = true;
    }

    // Method to check if a piece is needed
    needed(pieceIndex) {
        // If all pieces are requested, update the requested array
        if (this.requested.every((i) => i === true)) {
            this.requested = this.received.slice();
        }
        return !this.requested[pieceIndex];
    }

    // Method to check if all pieces are received
    isDone() {
        return this.received.every((i) => i === true);
    }
};
