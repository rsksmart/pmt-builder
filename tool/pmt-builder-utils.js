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
const getWtxids = async (transactionsClient, blockTxids, targetTxId) => {
    const blockWtxids = [];
    let targetWtxid;
    for (let i = 0; i < blockTxids.length; i++) {
        const txid = blockTxids[i];
        const wtxid = await getWtxid(transactionsClient, txid);

        if (txid === targetTxId) {
            targetWtxid = wtxid;
        }

        blockWtxids.push(wtxid);
        if (i < blockTxids.length - 1) {
            await sleep();
        }
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
    const wtxid = tx.getHash(true).reverse().toString('hex');
    return wtxid;
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
 * Fetches transaction details with retry logic in case of rate limiting errors.
 *
 * This function attempts to retrieve transaction details for a given transaction ID
 * using the specified transaction API. If a rate-limiting error is encountered
 * (e.g., HTTP 429 status or related error messages), it retries the request with
 * exponential backoff until the maximum retry attempts are exhausted.
 *
 * @param {Object} transactionsClient - Client instance used to fetch transaction data (must provide `getTxHex`).
 * @param {string} txId - The transaction ID for which details need to be fetched.
 * @param {number} [retries=0] - The current retry attempt count. Defaults to 0.
 * @returns {Promise<Object|null>} - A promise that resolves to the transaction details if
 * the operation is successful, or `null` if all retries fail or an unexpected error occurs.
 * @throws {Error} - If the function encounters an unrecoverable error other than rate limiting.
 */
const getTransactionWithRetry = async (transactionsClient, txId, retries = 0) => {
    try {
        return await transactionsClient.getTxHex({txid: txId});
    } catch (error) {
        // mempool.js might wrap the error, so we check for common indicators of too many requests error code (429)
        const isRateLimitError = error.response && error.response.status === TOO_MANY_REQUESTS_ERROR_CODE;

        // Sometimes the error message might contain clues if status code is not too many requests error code (429)
        const isMempoolSpecificRateLimit = error.message && error.message.includes('Too Many Requests');

        if ((isRateLimitError || isMempoolSpecificRateLimit) && retries < MAX_RETRIES) {
            const delay = RETRY_DELAY_FACTOR_MS * Math.pow(2, retries); // Exponential backoff
            console.warn(`Rate limit hit for ${txId}. Retrying in ${delay / 1000} seconds... (Attempt ${retries + 1}/${MAX_RETRIES})`);
            await sleep(delay);
            return getTransactionWithRetry(transactionsClient, txId, retries + 1);
        }

        throw new Error(`Failed to fetch transaction details for txId: ${txId} after ${retries} retries. Error: ${error.message}`);
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
 * Fetches the block information (block hash, block height, and transaction IDs) for a given transaction hash.
 * @param {Object} blocksClient - The blocks client instance used to interact with the blockchain.
 * @param {Object} transactionsClient - The transactions client instance used to interact with the blockchain.
 * @param {string} txHash - The transaction hash for which to find the block information.
 * @returns {Promise<{blockHash: string, blockHeight: number, blockTxids: string[]}>} - A promise that resolves to an object containing the block hash, block height, and transaction IDs in the same block.
 */
const getBlockInfoByTransactionHash = async (blocksClient, transactionsClient, txHash) => {
    const transaction = await transactionsClient.getTx({ txid: txHash });
    const blockHash = transaction.status.block_hash;
    const blockTxids = await blocksClient.getBlockTxids({ hash: blockHash });
    const blockHeight = transaction.status.block_height;

    return {
        blockHash,
        blockHeight,
        blockTxids,
    };
};

module.exports = { getWtxids, sleep, getTransactionWithRetry, getBlockTxidsByTransactionHash, getBlockInfoByTransactionHash, REQUEST_DELAY_MS };
