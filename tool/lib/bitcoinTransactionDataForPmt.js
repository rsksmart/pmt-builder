const { getBitcoinTransactionDataForPmtFromMempool } = require('./bitcoinMempoolData');
const { getBitcoinTransactionDataForPmtFromBitcoind } = require('./bitcoinBitcoindData');

const MEMPOOL_NETWORKS = new Set(['mainnet', 'testnet']);

/**
 * Fetches raw hex, confirming block height, and ordered txids in that block.
 * mainnet/testnet use mempool.space; regtest uses local Bitcoin Core RPC.
 *
 * @param {string} transactionHash
 * @param {'mainnet'|'testnet'|'regtest'} network
 * @returns {Promise<{ rawHex: string, blockHeight: number, blockTxids: string[] }>}
 */
async function getBitcoinTransactionDataForPmt(transactionHash, network) {
    if (network === 'regtest') {
        return getBitcoinTransactionDataForPmtFromBitcoind(transactionHash);
    }
    if (MEMPOOL_NETWORKS.has(network)) {
        return getBitcoinTransactionDataForPmtFromMempool(transactionHash, network);
    }
    throw new Error(
        `Unsupported network "${network}". Use mainnet, testnet, or regtest.`
    );
}

module.exports = { getBitcoinTransactionDataForPmt };
