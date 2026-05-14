const bitcoinJs = require('bitcoinjs-lib');
const merkleLib = require('merkle-lib');
const pmtBuilder = require('../../index');

/**
 * BIP141 witness merkle root (display byte order): coinbase leaf is 32 zero bytes; other leaves are wtxids.
 *
 * @param {bitcoinJs.Transaction[]} txs - block order; `txs[0]` is ignored for leaves (coinbase not hashed)
 * @returns {string} hex without `0x` prefix (same convention as previous in-file implementation)
 */
function witnessMerkleRootHexFromBlockTxs(txs) {
    if (!txs || txs.length === 0) {
        throw new Error('Block has no transactions for witness merkle root computation.');
    }
    const hashesWithWitness = [
        Buffer.alloc(32, 0),
        ...txs.slice(1).map((tx) => Buffer.from(tx.getHash(true))),
    ];
    const witnessMerkleTree = merkleLib(hashesWithWitness, bitcoinJs.crypto.hash256);
    const witnessMerkleRootBuffer = Buffer.from(witnessMerkleTree[witnessMerkleTree.length - 1]);
    witnessMerkleRootBuffer.reverse();
    return witnessMerkleRootBuffer.toString('hex');
}

/**
 * @param {string} blockHash
 * @param {string[]} blockTxids
 * @param {bitcoinJs.Transaction} coinbaseTx
 * @param {bitcoinJs.Transaction[]} txs - same order as blockTxids
 */
function buildRegisterCoinbaseResult(blockHash, blockTxids, coinbaseTx, txs) {
    if (!coinbaseTx.ins || coinbaseTx.ins.length === 0) {
        throw new Error('Coinbase transaction has no inputs.');
    }
    const witness = coinbaseTx.ins[0].witness;
    if (!witness || witness.length === 0) {
        throw new Error(
            'Coinbase has no witness data (expected SegWit coinbase with witness reserved value at witness[0]). Pre-SegWit or malformed coinbase.',
        );
    }
    const witnessReservedValue = Buffer.from(witness[0]).toString('hex');

    const coinbaseTxWithoutWitness = coinbaseTx.clone();
    coinbaseTxWithoutWitness.stripWitnesses();
    const coinbaseTxHashWithoutWitness = coinbaseTxWithoutWitness.getId();

    const witnessMerkleRootHex = witnessMerkleRootHexFromBlockTxs(txs);

    const { hex: coinbasePmt } = pmtBuilder.buildPMT(blockTxids, coinbaseTxHashWithoutWitness);

    return {
        btcTxSerialized: `0x${coinbaseTxWithoutWitness.toHex()}`,
        btcBlockHash: `0x${blockHash}`,
        pmtSerialized: `0x${coinbasePmt}`,
        witnessMerkleRoot: `0x${witnessMerkleRootHex}`,
        witnessReservedValue: `0x${witnessReservedValue}`,
    };
}

/**
 * @param {string} blockHash
 * @param {string[]} blockTxids
 * @param {bitcoinJs.Transaction[]} txs - same order as `blockTxids`; first entry is coinbase
 */
function buildRegisterCoinbaseResultFromBlockTxs(blockHash, blockTxids, txs) {
    const coinbaseTx = txs[0];
    if (!coinbaseTx) {
        throw new Error('Block has no coinbase transaction.');
    }
    return buildRegisterCoinbaseResult(blockHash, blockTxids, coinbaseTx, txs);
}

module.exports = {
    witnessMerkleRootHexFromBlockTxs,
    buildRegisterCoinbaseResult,
    buildRegisterCoinbaseResultFromBlockTxs,
};
