const {
    bitcoindRpc,
    RPC_GETRAWTRANSACTION_DECODE,
    RPC_GETRAWTRANSACTION_HEX,
    RPC_GETBLOCK_TXID_LIST,
} = require('./bitcoindRpc');
const { getTransactionWithRetry, withMempool429Retry } = require('../pmt-builder-utils');

/**
 * Bitcoin Core JSON-RPC clients compatible with {@link ../pmt-builder-utils.js} /
 * {@link ../mempool-api-client.js} expectations (blocks + transactions shape).
 *
 * @returns {{ blocks: { getBlockTxids: function }, transactions: { getTx: function, getTxHex: function } }}
 */
function createBitcoindBitcoinClients() {
    const txHexClient = {
        getTxHex: ({ txid }) => bitcoindRpc('getrawtransaction', [txid, RPC_GETRAWTRANSACTION_HEX]),
    };

    const transactions = {
        /**
         * Mempool-shaped summary for {@link getBlockInfoByTransactionHash}.
         *
         * @param {{ txid: string }} params
         * @returns {Promise<{ status: { block_hash?: string, block_height?: number } }>}
         */
        async getTx({ txid }) {
            const v = await withMempool429Retry(
                () => bitcoindRpc('getrawtransaction', [txid, RPC_GETRAWTRANSACTION_DECODE]),
                `bitcoind getrawtransaction ${txid}`,
            );
            const blockHash = v.blockhash;
            if (!blockHash) {
                return { status: {} };
            }
            const header = await withMempool429Retry(
                () => bitcoindRpc('getblockheader', [blockHash]),
                `bitcoind getblockheader ${blockHash}`,
            );
            return {
                status: {
                    block_hash: blockHash,
                    block_height: header.height,
                },
            };
        },

        /**
         * @param {{ txid: string }} params
         * @returns {Promise<string>}
         */
        async getTxHex({ txid }) {
            return getTransactionWithRetry(txHexClient, txid);
        },
    };

    const blocks = {
        /**
         * @param {{ hash: string }} params
         * @returns {Promise<string[]>}
         */
        async getBlockTxids({ hash }) {
            const block = await withMempool429Retry(
                () => bitcoindRpc('getblock', [hash, RPC_GETBLOCK_TXID_LIST]),
                `bitcoind getblock ${hash}`,
            );
            if (!block || !Array.isArray(block.tx)) {
                throw new Error('bitcoind getblock: expected tx array of txids');
            }
            return block.tx;
        },
    };

    return { blocks, transactions };
}

module.exports = { createBitcoindBitcoinClients };
