const { createMempoolBitcoinClients } = require('../mempool-api-client');
const { getTransactionWithRetry, withMempool429Retry } = require('../pmt-builder-utils');

/**
 * Loads tx + block data from mempool.space (mainnet / testnet only).
 *
 * @param {string} transactionHash
 * @param {'mainnet'|'testnet'} network
 * @returns {Promise<{ rawHex: string, blockHeight: number, blockTxids: string[] }>}
 */
async function getBitcoinTransactionDataForPmtFromMempool(transactionHash, network) {
    const { blocks, transactions } = createMempoolBitcoinClients(network);

    const transaction = await withMempool429Retry(
        () => transactions.getTx({ txid: transactionHash }),
        `getTx ${transactionHash}`,
    );

    if (!transaction.status || !transaction.status.block_hash || transaction.status.block_height == null) {
        throw new Error(
            `Transaction ${transactionHash} is not confirmed (missing block in mempool.space response). Wait for confirmations or check the txid.`,
        );
    }

    const blockHash = transaction.status.block_hash;
    const blockHeight = transaction.status.block_height;

    const blockTxids = await withMempool429Retry(
        () => blocks.getBlockTxids({ hash: blockHash }),
        `getBlockTxids ${blockHash}`,
    );

    const rawHex = await getTransactionWithRetry(transactions, transactionHash);

    return {
        rawHex,
        blockHeight,
        blockTxids,
    };
}

module.exports = { getBitcoinTransactionDataForPmtFromMempool };
