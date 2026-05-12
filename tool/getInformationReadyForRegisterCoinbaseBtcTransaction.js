const bitcoinJs = require('bitcoinjs-lib');
const merkleLib = require('merkle-lib');
const { createMempoolBitcoinClients } = require("./mempool-api-client");
const { sleep, getTransactionWithRetry, getBlockInfoByTransactionHash, REQUEST_DELAY_MS } = require("./pmt-builder-utils");
const pmtBuilder = require("../index");

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
 * Retrieves all transaction objects in a block by their transaction IDs.
 * @param {Object} transactionsClient - Client instance used to fetch transaction data (must provide `getTxHex`).
 * @param {string[]} txIds - An array of txIds.
 * @returns {Promise<string[]>} An array of transactions.
 */
const getAllTxs = async (transactionsClient, txIds) => {
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

        const tx = await getTransactionWithRetry(transactionsClient, txId);
        txs.push(bitcoinJs.Transaction.fromHex(tx));

        // Apply throttling delay, but not after the very last request
        if (i < txIds.length - 1) {
            await sleep();
        }
    }

    // Clear the progress line after completion
    clearProgress();
    console.log(`\nFinished fetching ${totalTxs} transactions.`); // Final message on a new line

    return txs;
};

const getInformationReadyForRegisterCoinbaseBtcTransaction = async (network, txHash) => {
    const { blocks, transactions } = createMempoolBitcoinClients(network);

    const { blockHash, blockTxids } = await getBlockInfoByTransactionHash(blocks, transactions, txHash);

    const coinbaseTxId = blockTxids[0];
    const rawCoinbaseBtcTx = await getTransactionWithRetry(transactions, coinbaseTxId);
    const coinbaseTx = bitcoinJs.Transaction.fromHex(rawCoinbaseBtcTx);

    const witnessReservedValue = Buffer.from(coinbaseTx.ins[0].witness[0]).toString('hex');

    const coinbaseTxWithoutWitness = coinbaseTx.clone();
    coinbaseTxWithoutWitness.stripWitnesses();
    const coinbaseTxHashWithoutWitness = coinbaseTxWithoutWitness.getId();
    const txs = await getAllTxs(transactions, blockTxids);

    // Calculate witnessRoot
    const hashesWithWitness = txs.map( x => Buffer.from(x.getHash(true)));
    const witnessMerkleTree = merkleLib(hashesWithWitness, bitcoinJs.crypto.hash256);
    // Last element is the root; reverse for registerCoinbase byte order (same as Buffer-based merkle-lib output).
    const witnessMerkleRootBuffer = Buffer.from(witnessMerkleTree[witnessMerkleTree.length - 1]);
    witnessMerkleRootBuffer.reverse();

    const {hex: coinbasePmt} = pmtBuilder.buildPMT(blockTxids, coinbaseTxHashWithoutWitness);

    return {
        btcTxSerialized: `0x${coinbaseTxWithoutWitness.toHex()}`,
        btcBlockHash: `0x${blockHash}`,
        pmtSerialized: `0x${coinbasePmt}`,
        witnessMerkleRoot: `0x${witnessMerkleRootBuffer.toString('hex')}`,
        witnessReservedValue: `0x${witnessReservedValue}`,
    };
};

(async () => {
    try {
        const network = process.argv[2];
        const txHash = process.argv[3];

        const informationReadyForRegisterCoinbaseBtcTransaction = await getInformationReadyForRegisterCoinbaseBtcTransaction(network, txHash);

        console.log('Transaction Information ready for registerCoinbaseBtcTransaction: ', informationReadyForRegisterCoinbaseBtcTransaction);

    } catch (e) {
        console.log(e);
    }
})();
