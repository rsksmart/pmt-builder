const { bitcoindRpc } = require('./bitcoindRpc');

/**
 * Loads tx + block data from a local Bitcoin Core node (regtest / any network
 * reachable via RPC). Requires txindex=1 (or similar) for getrawtransaction
 * on confirmed txs not in the wallet.
 *
 * @param {string} transactionHash
 * @returns {Promise<{ rawHex: string, blockHeight: number, blockTxids: string[] }>}
 */
async function getBitcoinTransactionDataForPmtFromBitcoind(transactionHash) {
    const verboseTx = await bitcoindRpc('getrawtransaction', [transactionHash, true]);

    const blockHash = verboseTx.blockhash;
    if (!blockHash) {
        throw new Error(
            'Transaction has no blockhash (unconfirmed?). Confirm the tx or enable txindex for getrawtransaction.'
        );
    }

    const block = await bitcoindRpc('getblock', [blockHash, 1]);
    const blockHeight = block.height;
    const blockTxids = block.tx;

    const rawHex =
        typeof verboseTx.hex === 'string' && verboseTx.hex.length > 0
            ? verboseTx.hex
            : await bitcoindRpc('getrawtransaction', [transactionHash, false]);

    return {
        rawHex,
        blockHeight,
        blockTxids,
    };
}

module.exports = { getBitcoinTransactionDataForPmtFromBitcoind };
