const bitcoin = require('bitcoinjs-lib');

const MAX_RETRIES = 5;       // Max retries for a failed request
const RETRY_DELAY_FACTOR_MS = 1000; // Base delay for retries (1000ms = 1 second)
const REQUEST_DELAY_MS = 200; // Delay between individual TX detail requests (200ms = 0.2 seconds)
const TOO_MANY_REQUESTS_ERROR_CODE = 429; // HTTP status code for Too Many Requests

/**
 * Calculates the wtxid for a given transaction ID by fetching the raw transaction data and computing the hash.
 * @param {Object} transactionsClient - Client instance used to fetch transaction data (must provide `getTxHex`).
 * @param {string[]} blockTxids - Array of transaction IDs in the block.
 * @param {string} targetTxId - The transaction ID for which the wtxid is specifically needed.
 * @returns {Promise<{blockWtxids: string[], targetWtxid: string}>} - An object containing all wtxids and the target wtxid.
 * @throws {Error} - If the transaction details cannot be fetched or if the transaction is malformed.
 */
const fetchBlockWtxidsWithTargetWtxid = async (transactionsClient, blockTxids, targetTxId) => {
    const blockWtxids = [];
    let targetWtxid;
    for (let i = 0; i < blockTxids.length; i++) {
        const txid = blockTxids[i];
        const wtxid = await getWtxid(transactionsClient, txid);

        if (txid === targetTxId) {
            targetWtxid = wtxid;
        }

        blockWtxids.push(wtxid);
    }
    return { blockWtxids, targetWtxid };
};

/**
 * Calculates the wtxid for a given transaction ID by fetching the raw transaction data and computing the hash.
 * @param {Object} transactionsClient - Client instance used to fetch transaction data (must provide `getTxHex`).
 * @param {string} txId - The transaction ID for which details need to be fetched.
 * @returns {Promise<string>} - The wtxid of the transaction.
 * @throws {Error} - If the transaction details cannot be fetched or if the transaction is malformed.
 */
const getWtxid = async (transactionsClient, txid) => {
    const rawTx = await getTransactionWithRetry(transactionsClient, txid);
    const tx = bitcoin.Transaction.fromHex(rawTx);
    const hashBytes = Buffer.from(tx.getHash(true));
    hashBytes.reverse();
    return hashBytes.toString('hex');
};

/**
 * Sleeps for a given number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep. Defaults to REQUEST_DELAY_MS if not provided.
 * @returns {Promise<void>} A Promise that resolves after the specified delay.
 */
function sleep(ms = REQUEST_DELAY_MS) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Runs an async Mempool HTTP call with 429 / "Too Many Requests" exponential backoff.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {string} describe - Log label when rate limited
 * @param {number} [retries=0]
 * @returns {Promise<T>}
 */
const withMempool429Retry = async (fn, describe, retries = 0) => {
    try {
        return await fn();
    } catch (error) {
        const isRateLimitError = error.response && error.response.status === TOO_MANY_REQUESTS_ERROR_CODE;
        const isMempoolSpecificRateLimit = error.message && error.message.includes('Too Many Requests');

        if ((isRateLimitError || isMempoolSpecificRateLimit) && retries < MAX_RETRIES) {
            const delay = RETRY_DELAY_FACTOR_MS * Math.pow(2, retries);
            console.warn(`Rate limit hit for ${describe}. Retrying in ${delay / 1000} seconds... (Attempt ${retries + 1}/${MAX_RETRIES})`);
            await sleep(delay);
            return withMempool429Retry(fn, describe, retries + 1);
        }

        throw error;
    }
};

/**
 * Fetches raw transaction hex with retry logic for Mempool HTTP 429 / "Too Many Requests".
 *
 * @param {Object} transactionsClient - Client instance used to fetch transaction data (must provide `getTxHex`).
 * @param {string} txId - The transaction ID for which details need to be fetched.
 * @returns {Promise<string>}
 * @throws {Error} - If the function encounters an unrecoverable error or exhausts retries.
 */
const getTransactionWithRetry = async (transactionsClient, txId) => {
    try {
        return await withMempool429Retry(
            () => transactionsClient.getTxHex({ txid: txId }),
            `getTxHex ${txId}`,
        );
    } catch (error) {
        throw new Error(`Failed to fetch transaction details for txId: ${txId}. Error: ${error.message}`);
    }
};

/**
 * Fetches the transaction IDs (txids) of all transactions in the same block as the given transaction.
 * @param {Object} blocksClient - The blocks client instance used to interact with the blockchain.
 * @param {Object} transactionsClient - The transactions client instance used to interact with the blockchain.
 * @param {string} txHash - The transaction hash for which to find the block's transaction IDs.
 * @returns {Promise<string[]>} - A promise that resolves to an array of transaction IDs in the same block.
 */

const getBlockTxidsByTransactionHash = async (blocksClient, transactionsClient , txHash) => {
    const { blockTxids } = await getBlockInfoByTransactionHash(blocksClient, transactionsClient, txHash);
    return blockTxids;
};


/**
 * Fetches the wtxids of all transactions in the same block as the given transaction, along with the target transaction's wtxid.
 * Block transactions' wtxids and target transaction's wtxid are returned together to avoid redundant calls to the
 * transactions client.
 * @param {Object} blocksClient - The blocks client instance used to interact with the blockchain.
 * @param {Object} transactionsClient - The transactions client instance used to interact with the blockchain.
 * @param {string} txHash - The transaction hash for which to find the block's wtxids and target wtxid.
 * @returns {Promise<{blockWtxids: string[], targetWtxid: string}>} - A promise that resolves to an object containing the wtxids of all transactions in the same block and the target transaction's wtxid.
 */
const getBlockWtxidsWithTargetWtxidByTransactionHash = async (blocksClient, transactionsClient , txHash) => {
    const { blockTxids } = await getBlockInfoByTransactionHash(blocksClient, transactionsClient, txHash);
    return await fetchBlockWtxidsWithTargetWtxid(transactionsClient, blockTxids, txHash);
};


/**
 * Fetches the block information (block hash, block height, and transaction IDs) for a given transaction hash.
 * @param {Object} blocksClient - The blocks client instance used to interact with the blockchain.
 * @param {Object} transactionsClient - The transactions client instance used to interact with the blockchain.
 * @param {string} txHash - The transaction hash for which to find the block information.
 * @returns {Promise<{blockHash: string, blockHeight: number, blockTxids: string[]}>} - A promise that resolves to an object containing the block hash, block height, and transaction IDs in the same block.
 */
const getBlockInfoByTransactionHash = async (blocksClient, transactionsClient, txHash) => {
    const transaction = await withMempool429Retry(
        () => transactionsClient.getTx({ txid: txHash }),
        `getTx ${txHash}`,
    );
    if (!transaction.status || !transaction.status.block_hash || transaction.status.block_height == null) {
        throw new Error(
            `Transaction ${txHash} is not confirmed (missing block in API response). Wait for confirmations or check the txid.`,
        );
    }
    const blockHash = transaction.status.block_hash;
    const blockTxids = await withMempool429Retry(
        () => blocksClient.getBlockTxids({ hash: blockHash }),
        `getBlockTxids ${blockHash}`,
    );
    const blockHeight = transaction.status.block_height;

    return {
        blockHash,
        blockHeight,
        blockTxids,
    };
};

module.exports = {
    fetchBlockWtxidsWithTargetWtxid,
    sleep,
    getTransactionWithRetry,
    withMempool429Retry,
    getBlockTxidsByTransactionHash,
    getBlockWtxidsWithTargetWtxidByTransactionHash,
    getBlockInfoByTransactionHash,
    REQUEST_DELAY_MS,
};
