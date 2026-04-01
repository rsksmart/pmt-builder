const bitcoin = require('bitcoinjs-lib');

const MAX_RETRIES = 5;       // Max retries for a failed request
const RETRY_DELAY_FACTOR_MS = 1000; // Base delay for retries (1000ms = 1 second)
const REQUEST_DELAY_MS = 200; // Delay between individual TX detail requests (200ms = 0.2 seconds)

const getWtxid = (rawTx) => {
    const tx = bitcoin.Transaction.fromHex(rawTx);
    const wtxid = tx.getHash(true).reverse().toString('hex');
    return wtxid;
}

/**
 * Sleeps for a given number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep. Defaults to REQUEST_DELAY_MS if not provided.
 * @returns {Promise<void>} A Promise that resolves after the specified delay.
 */
function sleep(ms = REQUEST_DELAY_MS) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches transaction details with retry logic in case of rate limiting errors.
 *
 * This function attempts to retrieve transaction details for a given transaction ID
 * using the specified transaction API. If a rate-limiting error is encountered
 * (e.g., HTTP 429 status or related error messages), it retries the request with
 * exponential backoff until the maximum retry attempts are exhausted.
 *
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
        // mempool.js might wrap the error, so we check for common indicators of 429
        const isRateLimitError = error.response && error.response.status === 429;

        // Sometimes the error message might contain clues if status is not directly 429
        const isMempoolSpecificRateLimit = error.message && error.message.includes('Too Many Requests');

        if ((isRateLimitError || isMempoolSpecificRateLimit) && retries < MAX_RETRIES) {
            const delay = RETRY_DELAY_FACTOR_MS * Math.pow(2, retries); // Exponential backoff
            console.warn(`Rate limit hit for ${txId}. Retrying in ${delay / 1000} seconds... (Attempt ${retries + 1}/${MAX_RETRIES})`);
            await sleep(delay);
            return getTransactionWithRetry(transactionsClient, txId, retries + 1);
        } else {
            console.error(`Error fetching details for txid ${txId} after ${retries} retries:`, error.message);
            return null;
        }
    }
};

module.exports = { getWtxid, sleep, getTransactionWithRetry, REQUEST_DELAY_MS };
