const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    quiet: true,
});

const bitcoinJs = require("bitcoinjs-lib");
const merkleLib = require("merkle-lib");
const { createMempoolBitcoinClients } = require("./mempool-api-client");
const {
    sleep,
    getTransactionWithRetry,
    getBlockInfoByTransactionHash,
    REQUEST_DELAY_MS,
} = require("./pmt-builder-utils");
const pmtBuilder = require("../index");
const {
    getBlockHashAndTxidsForConfirmedTx,
    getRawTransactionHex,
    getBlockTransactionsFromBitcoind,
} = require("./lib/bitcoinCoinbaseDataFromBitcoind");

function updateProgress(currentIndex, totalCount) {
    process.stdout.write(`Fetching transactions: ${currentIndex}/${totalCount}\r`);
}

function clearProgress() {
    process.stdout.write("\x1b[2K\r");
}

/**
 * @param {Object} transactionsClient - must provide `getTxHex({ txid })`.
 * @param {string[]} txIds
 * @returns {Promise<bitcoinJs.Transaction[]>}
 */
const getAllTxs = async (transactionsClient, txIds) => {
    if (txIds.length === 0) {
        console.log("No transactions found in the block.");
        return [];
    }

    const txs = [];
    console.log(
        `Found ${txIds.length} transactions. Fetching details with ${REQUEST_DELAY_MS}ms delay per request...`,
    );

    const totalTxs = txIds.length;

    for (let i = 0; i < txIds.length; i++) {
        const txId = txIds[i];
        updateProgress(i + 1, totalTxs);
        const tx = await getTransactionWithRetry(transactionsClient, txId);
        txs.push(bitcoinJs.Transaction.fromHex(tx));
        if (i < txIds.length - 1) {
            await sleep();
        }
    }

    clearProgress();
    console.log(`\nFinished fetching ${totalTxs} transactions.`);

    return txs;
};

/**
 * @param {string} blockHash
 * @param {string[]} blockTxids
 * @param {bitcoinJs.Transaction} coinbaseTx
 * @param {bitcoinJs.Transaction[]} txs - same order as blockTxids
 */
const buildRegisterCoinbaseResult = (blockHash, blockTxids, coinbaseTx, txs) => {
    const witnessReservedValue = Buffer.from(coinbaseTx.ins[0].witness[0]).toString("hex");

    const coinbaseTxWithoutWitness = coinbaseTx.clone();
    coinbaseTxWithoutWitness.stripWitnesses();
    const coinbaseTxHashWithoutWitness = coinbaseTxWithoutWitness.getId();

    const hashesWithWitness = txs.map((x) => Buffer.from(x.getHash(true)));
    const witnessMerkleTree = merkleLib(hashesWithWitness, bitcoinJs.crypto.hash256);
    const witnessMerkleRootBuffer = Buffer.from(witnessMerkleTree[witnessMerkleTree.length - 1]);
    witnessMerkleRootBuffer.reverse();

    const { hex: coinbasePmt } = pmtBuilder.buildPMT(blockTxids, coinbaseTxHashWithoutWitness);

    return {
        btcTxSerialized: `0x${coinbaseTxWithoutWitness.toHex()}`,
        btcBlockHash: `0x${blockHash}`,
        pmtSerialized: `0x${coinbasePmt}`,
        witnessMerkleRoot: `0x${witnessMerkleRootBuffer.toString("hex")}`,
        witnessReservedValue: `0x${witnessReservedValue}`,
    };
};

const getInformationReadyForRegisterCoinbaseBtcTransactionMempool = async (network, txHash) => {
    const { blocks, transactions } = createMempoolBitcoinClients(network);

    const { blockHash, blockTxids } = await getBlockInfoByTransactionHash(blocks, transactions, txHash);

    const coinbaseTxId = blockTxids[0];
    const rawCoinbaseBtcTx = await getTransactionWithRetry(transactions, coinbaseTxId);
    const coinbaseTx = bitcoinJs.Transaction.fromHex(rawCoinbaseBtcTx);

    const txs = await getAllTxs(transactions, blockTxids);

    return buildRegisterCoinbaseResult(blockHash, blockTxids, coinbaseTx, txs);
};

const getInformationReadyForRegisterCoinbaseBtcTransactionRegtest = async (txHash) => {
    const { blockHash, blockTxids } = await getBlockHashAndTxidsForConfirmedTx(txHash);

    const coinbaseTxId = blockTxids[0];
    const rawCoinbaseBtcTx = await getRawTransactionHex(coinbaseTxId);
    const coinbaseTx = bitcoinJs.Transaction.fromHex(rawCoinbaseBtcTx);

    console.log(
        `Found ${blockTxids.length} transactions. Fetching from local bitcoind (no delay)...`,
    );
    const txs = await getBlockTransactionsFromBitcoind(blockTxids, updateProgress);
    clearProgress();
    console.log(`\nFinished fetching ${blockTxids.length} transactions.`);

    return buildRegisterCoinbaseResult(blockHash, blockTxids, coinbaseTx, txs);
};

const getInformationReadyForRegisterCoinbaseBtcTransaction = async (network, txHash) => {
    if (network === "regtest") {
        return getInformationReadyForRegisterCoinbaseBtcTransactionRegtest(txHash);
    }
    if (network === "mainnet" || network === "testnet") {
        return getInformationReadyForRegisterCoinbaseBtcTransactionMempool(network, txHash);
    }
    throw new Error(
        `Unsupported network "${network}". Use mainnet, testnet, or regtest.`,
    );
};

(async () => {
    try {
        const network = process.argv[2];
        const txHash = process.argv[3];

        if (!network || !txHash) {
            console.log(
                "Usage: node tool/getInformationReadyForRegisterCoinbaseBtcTransaction.js <mainnet|testnet|regtest> <btcTxHashInBlock>",
            );
            process.exit(1);
        }

        const informationReadyForRegisterCoinbaseBtcTransaction =
            await getInformationReadyForRegisterCoinbaseBtcTransaction(network, txHash);

        console.log(
            "Transaction Information ready for registerCoinbaseBtcTransaction: ",
            informationReadyForRegisterCoinbaseBtcTransaction,
        );
    } catch (e) {
        console.log(e);
    }
})();
