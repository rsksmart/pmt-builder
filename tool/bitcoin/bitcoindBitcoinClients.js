const {
    bitcoindRpc,
    RPC_GETRAWTRANSACTION_DECODE,
    RPC_GETRAWTRANSACTION_HEX,
    RPC_GETBLOCK_TXID_LIST,
} = require('./bitcoindRpc');

/**
 * Bitcoin Core JSON-RPC clients compatible with {@link ../pmt-builder-utils.js} /
 * {@link ../mempool-api-client.js} expectations (blocks + transactions shape).
 *
 * Uses plain {@link ./bitcoindRpc.js} calls (no mempool-style 429 wrapper on hex fetches).
 * {@link ../pmt-builder-utils.js#getBlockInfoByTransactionHash} still wraps `getTx` / `getBlockTxids`
 * when used through that helper.
 *
 * @returns {{ blocks: { getBlockTxids: function }, transactions: { getTx: function, getTxHex: function } }}
 */
function createBitcoindBitcoinClients() {
    const transactions = {
        /**
         * @param {{ txid: string }} params
         * @returns {Promise<{ status: { block_hash?: string, block_height?: number } }>}
         */
        async getTx({ txid }) {
            const decodedRawTransaction = await bitcoindRpc('getrawtransaction', [
                txid,
                RPC_GETRAWTRANSACTION_DECODE,
            ]);
            const blockHash = decodedRawTransaction.blockhash;
            if (!blockHash) {
                return { status: {} };
            }
            const blockHeader = await bitcoindRpc('getblockheader', [blockHash]);
            return {
                status: {
                    block_hash: blockHash,
                    block_height: blockHeader.height,
                },
            };
        },

        /**
         * @param {{ txid: string }} params
         * @returns {Promise<string>}
         */
        async getTxHex({ txid }) {
            return bitcoindRpc('getrawtransaction', [txid, RPC_GETRAWTRANSACTION_HEX]);
        },
    };

    const blocks = {
        /**
         * @param {{ hash: string }} params
         * @returns {Promise<string[]>}
         */
        async getBlockTxids({ hash }) {
            const block = await bitcoindRpc('getblock', [hash, RPC_GETBLOCK_TXID_LIST]);
            if (!block || !Array.isArray(block.tx)) {
                throw new Error('bitcoind getblock: expected tx array of txids');
            }
            return block.tx;
        },
    };

    return { blocks, transactions };
}

module.exports = { createBitcoindBitcoinClients };
