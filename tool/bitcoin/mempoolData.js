const { createMempoolBitcoinClients } = require('../mempool-api-client');
const { getTransactionWithRetry, getBlockInfoByTransactionHash } = require('../pmt-builder-utils');

/**
 * Loads tx + block data from mempool.space (mainnet / testnet only).
 *
 * @param {string} transactionHash
 * @param {'mainnet'|'testnet'} network
 * @returns {Promise<{ rawHex: string, blockHeight: number, blockTxids: string[] }>}
 */
async function getBitcoinTransactionDataForPmtFromMempool(transactionHash, network) {
    const { blocks, transactions } = createMempoolBitcoinClients(network);
    const { blockHeight, blockTxids } = await getBlockInfoByTransactionHash(
        blocks,
        transactions,
        transactionHash,
        { unconfirmedBlockDetail: 'in mempool.space response' },
    );
    const rawHex = await getTransactionWithRetry(transactions, transactionHash);

    return {
        rawHex,
        blockHeight,
        blockTxids,
    };
}

module.exports = { getBitcoinTransactionDataForPmtFromMempool };
