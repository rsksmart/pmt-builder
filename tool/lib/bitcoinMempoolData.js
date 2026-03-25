const { createMempoolBitcoinClients } = require("../mempool-api-client");

/**
 * Loads tx + block data from mempool.space (mainnet / testnet only).
 *
 * @param {string} transactionHash
 * @param {'mainnet'|'testnet'} network
 * @returns {Promise<{ rawHex: string, blockHeight: number, blockTxids: string[] }>}
 */
async function getBitcoinTransactionDataForPmtFromMempool(transactionHash, network) {
    const { blocks, transactions } = createMempoolBitcoinClients(network);

    const transaction = await transactions.getTx({ txid: transactionHash });
    const blockHash = transaction.status.block_hash;
    const blockHeight = transaction.status.block_height;

    const blockTxids = await blocks.getBlockTxids({ hash: blockHash });
    const rawHex = await transactions.getTxHex({ txid: transactionHash });

    return {
        rawHex,
        blockHeight,
        blockTxids,
    };
}

module.exports = { getBitcoinTransactionDataForPmtFromMempool };
