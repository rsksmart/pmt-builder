const bitcoinJs = require('bitcoinjs-lib');
const merkleLib = require('merkle-lib');
const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");

const REQUEST_DELAY_MS = 200; // Delay between individual TX detail requests (200ms = 0.2 seconds)
const MAX_RETRIES = 5;       // Max retries for a failed request
const RETRY_DELAY_FACTOR_MS = 1000; // Base delay for retries (1000ms = 1 second)

let blocksClient;
let transactionsClient;


// Function to update the progress in the console
function updateProgress(currentIndex, totalCount) {
    // \r moves the cursor to the beginning of the line, effectively overwriting it
    // process.stdout.write is used for non-newline output
    process.stdout.write(`Fetching transactions: ${currentIndex}/${totalCount}\r`);
}

// Function to clear the progress line (optional, useful when done)
function clearProgress() {
    process.stdout.write('\x1b[2K\r'); // ANSI escape code to clear the current line
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
const getTransactionWithRetry = async (txId, retries = 0) => {
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
            return getTransactionWithRetry(txId, retries + 1);
        } else {
            console.error(`Error fetching details for txid ${txId} after ${retries} retries:`, error.message);
            return null;
        }
    }
};

/**
 * Sleeps for a given number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A Promise that resolves after the specified delay.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retrieves all transaction objects in a block by their transaction IDs.
 * @param {string[]} txIds - An array of txIds.
 * @returns {Promise<string[]>} An array of transactions.
 */
const getAllTxs = async (txIds) => {
    if (txIds.length === 0) {
        console.log("No transactions found in the block.");
        return [];
    }

    const txs = [];
    console.log(`Found ${txIds.length} transactions. Fetching details with ${REQUEST_DELAY_MS}ms delay per request...`);

    // Total transactions to process
    const totalTxs = txIds.length;

    for (let i = 0; i < txIds.length; i++) {
        const txId = txIds[i];

        // Update progress before each request
        updateProgress(i + 1, totalTxs);

        // mempool.js getTx method returns an object that directly contains 'wtxid'
        const tx = await getTransactionWithRetry(txId);

        if (tx) {
            txs.push(bitcoinJs.Transaction.fromHex(tx));
        } else {
            console.error(`Failed to fetch transaction details for txId: ${txId}. It might not exist or is malformed.`);
            throw new Error('No wtxid found for txId: ' + txId);
        }

        // Apply throttling delay, but not after the very last request
        if (i < txIds.length - 1) {
            await sleep(REQUEST_DELAY_MS);
        }
    }

    // Clear the progress line after completion
    clearProgress();
    console.log(`\nFinished fetching ${totalTxs} transactions.`); // Final message on a new line

    return txs;
};

const getInformationReadyForRegisterCoinbaseBtcTransaction = async (transactionHash, network) => {

    const bitcoinClients = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    // Initialize the clients for blocks and transactions
    blocksClient = bitcoinClients.bitcoin.blocks;
    transactionsClient = bitcoinClients.bitcoin.transactions;

    const transaction = await transactionsClient.getTx({ txid: transactionHash });

    const blockHash = transaction.status.block_hash;
    const blockHeight = transaction.status.block_height;
    console.log(`btc block with the btc tx found in height ${blockHeight}. block hash: ${blockHash}`);

    const blockTxIds = await blocksClient.getBlockTxids({ hash: blockHash });

    const coinbaseTxId = blockTxIds[0];
    const rawCoinbaseBtcTx = await transactionsClient.getTxHex({ txid: coinbaseTxId });
    const coinbaseTx = bitcoinJs.Transaction.fromHex(rawCoinbaseBtcTx);

    // Hack to get the coinbase transaction hash without witness data
    const coinbaseTxWithoutWitness = bitcoinJs.Transaction.fromBuffer(coinbaseTx.__toBuffer(undefined, undefined, false));
    const coinbaseTxHashWithoutWitness = coinbaseTxWithoutWitness.getId();

    const witnessReservedValue = coinbaseTx.ins[0].witness[0].toString('hex');
    const txs = await getAllTxs(blockTxIds);

    // Calculate witnessRoot
    const hashesWithWitness = txs.map( x => Buffer.from(x.getHash(true)));
    const witnessMerkleTree = merkleLib(hashesWithWitness, bitcoinJs.crypto.hash256);
    // Get witness merkleRoot from witnessMerkleTree. This is equal to the last element in witnessMerkleTree array
    const witnessMerkleRoot = witnessMerkleTree[witnessMerkleTree.length-1].reverse();

    const {hex: coinbasePmt} = pmtBuilder.buildPMT(blockTxIds, coinbaseTxHashWithoutWitness);

    return {
        btcTxSerialized: `0x${coinbaseTxWithoutWitness.toHex()}`,
        btcBlockHash: `0x${blockHash}`,
        pmtSerialized: `0x${coinbasePmt}`,
        witnessMerkleRoot: `0x${witnessMerkleRoot.toString('hex')}`,
        witnessReservedValue: `0x${witnessReservedValue}`,
    };

};

(async () => {
    try {

        const network = process.argv[2];
        const transactionHash = process.argv[3];

        const informationReadyForRegisterCoinbaseBtcTransaction = await getInformationReadyForRegisterCoinbaseBtcTransaction(transactionHash, network);

        console.log('Transaction Information ready for registerCoinbaseBtcTransaction: ', informationReadyForRegisterCoinbaseBtcTransaction);

    } catch (e) {
        console.log(e);
    }
})();
