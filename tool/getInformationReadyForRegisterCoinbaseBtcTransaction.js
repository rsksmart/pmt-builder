const bitcoinJs = require('bitcoinjs-lib');
const merkleLib = require('merkle-lib');
const mempoolJS = require("@mempool/mempool.js");
const { sleep, getTransactionWithRetry, REQUEST_DELAY_MS } = require("./pmt-builder-utils");
const pmtBuilder = require("../index");

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
    const rawCoinbaseBtcTx = await getTransactionWithRetry(transactionsClient, coinbaseTxId);
    const coinbaseTx = bitcoinJs.Transaction.fromHex(rawCoinbaseBtcTx);

    // Hack to get the coinbase transaction hash without witness data
    const coinbaseTxWithoutWitness = bitcoinJs.Transaction.fromBuffer(coinbaseTx.__toBuffer(undefined, undefined, false));
    const coinbaseTxHashWithoutWitness = coinbaseTxWithoutWitness.getId();

    const witnessReservedValue = coinbaseTx.ins[0].witness[0].toString('hex');
    const txs = await getAllTxs(transactionsClient, blockTxIds);

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
