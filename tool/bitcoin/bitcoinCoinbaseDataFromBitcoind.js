const bitcoinJs = require('bitcoinjs-lib');
const { bitcoindRpc } = require('./bitcoindRpc');

/**
 * Block hash and ordered txids for the block that confirms `transactionHash`.
 *
 * @param {string} transactionHash
 * @returns {Promise<{ blockHash: string, blockTxids: string[] }>}
 */
async function getBlockHashAndTxidsForConfirmedTx(transactionHash) {
    const verboseTx = await bitcoindRpc('getrawtransaction', [transactionHash, true]);
    const blockHash = verboseTx.blockhash;
    if (!blockHash) {
        throw new Error(
            'Transaction has no blockhash (unconfirmed?). Confirm the tx or enable txindex for getrawtransaction.',
        );
    }
    const block = await bitcoindRpc('getblock', [blockHash, 1]);
    return {
        blockHash: block.hash,
        blockTxids: block.tx,
    };
}

/**
 * @param {string} txid
 * @returns {Promise<string>}
 */
async function getRawTransactionHex(txid) {
    return bitcoindRpc('getrawtransaction', [txid, false]);
}

/**
 * Loads full transactions in block order (local node; no rate-limit delay).
 *
 * @param {string[]} blockTxids
 * @param {(current: number, total: number) => void} [onProgress]
 * @returns {Promise<bitcoinJs.Transaction[]>}
 */
async function getBlockTransactionsFromBitcoind(blockTxids, onProgress) {
    const txs = [];
    for (let i = 0; i < blockTxids.length; i++) {
        if (onProgress) {
            onProgress(i + 1, blockTxids.length);
        }
        const hex = await getRawTransactionHex(blockTxids[i]);
        txs.push(bitcoinJs.Transaction.fromHex(hex));
    }
    return txs;
}

module.exports = {
    getBlockHashAndTxidsForConfirmedTx,
    getRawTransactionHex,
    getBlockTransactionsFromBitcoind,
};
