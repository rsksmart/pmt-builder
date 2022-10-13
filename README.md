![Github CI/CD](https://github.com/rsksmart/pmt-builder/actions/workflows/workflow.yml/badge.svg)

# pmt-builder

PartialMerkleTree builder library.

This library can be used to build a partial merkle tree for a block of transactions. A partial merkle tree is a pruned version of a full merkle tree, containing only the parts needed to prove a given transaction is part of the tree. 

## Installation

> npm install @rsksmart/pmt-builder

### Install dependencies

> npm install

## Usage

To build the tree, simply call the `buildPMT` function and pass the `leaves` as a list of strings and a `filteredHash` in string format, i.e buildPMT(leaves: string[], filteredHash: string)

First parameter {leaves}: An array of transaction hash of all transactions in a block. 
Second parameter {filteredHash}: transaction hash (the hash without witness) of the coinbase transaction.

The function returns an object with the following fields:
totalTX: the size of {leaves} in the array.
Hashes: All the hashes that build the partial merkle tree. This includes the leaves level as well as the upper levels of the tree.
flags: ???
Hex: The partial merkle tree serialized in hex format.

## Test

To run test:

> npm test

For any comments or suggestions, feel free to contribute or reach out at our [open slack](https://developers.rsk.co/slack).
