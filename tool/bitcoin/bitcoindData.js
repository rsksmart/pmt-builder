const bitcoinJs = require('bitcoinjs-lib');
const { createBitcoindClients } = require('./bitcoindBitcoinClients');
const { getBlockInfoByTransactionHash } = require('../pmt-builder-utils');

/**
 * Loads tx + block data from a local Bitcoin Core node (regtest / any network
 * reachable via RPC). Requires txindex=1 (or similar) for getrawtransaction
 * on confirmed txs not in the wallet.
 *
 * @param {string} transactionHash
 * @returns {Promise<{ rawHex: string, blockHeight: number, blockTxids: string[] }>}
 */
async function getBitcoinTransactionDataForPmtFromBitcoind(transactionHash) {
    const { blocks, transactions } = createBitcoindClients();
    const { blockHeight, blockTxids } = await getBlockInfoByTransactionHash(
        blocks,
        transactions,
        transactionHash,
        { unconfirmedBlockDetail: 'from Bitcoin Core (tx not confirmed, wrong network, or txindex disabled)' },
    );
    const rawHex = await transactions.getTxHex({ txid: transactionHash });
    return {
        rawHex,
        blockHeight,
        blockTxids,
    };
}

/**
 * Loads decoded txs for the given txids in order (e.g. full block order including coinbase).
 * Reuses `transactions` from {@link createBitcoindClients} so callers share one client.
 *
 * @param {{ getTxHex: function }} transactions - bitcoind client `transactions`
 * @param {string[]} txids
 * @param {(current: number, total: number) => void} [onProgress]
 * @returns {Promise<bitcoinJs.Transaction[]>}
 */
async function getTransactionsForTxidsFromBitcoind(transactions, txids, onProgress) {
    const txs = [];
    for (let i = 0; i < txids.length; i++) {
        if (onProgress) {
            onProgress(i + 1, txids.length);
        }
        const hex = await transactions.getTxHex({ txid: txids[i] });
        txs.push(bitcoinJs.Transaction.fromHex(hex));
    }
    return txs;
}

module.exports = {
    getBitcoinTransactionDataForPmtFromBitcoind,
    getTransactionsForTxidsFromBitcoind,
};
