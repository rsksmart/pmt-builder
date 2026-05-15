const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '..', '.env'),
    quiet: true,
});

const bitcoinJs = require('bitcoinjs-lib');
const { createMempoolBitcoinClients } = require('./mempool-api-client');
const { createBitcoindClients } = require('./bitcoin/bitcoindBitcoinClients');
const {
    sleep,
    getTransactionWithRetry,
    getBlockInfoByTransactionHash,
    REQUEST_DELAY_MS,
} = require('./pmt-builder-utils');
const { getTransactionsForTxidsFromBitcoind } = require('./bitcoin/bitcoindData');
const { parseBridgeRegisterBtcCliArgs } = require('./bitcoin/registerBtcCliArgs');
const { buildRegisterCoinbaseResultFromBlockTxs } = require('./bitcoin/registerBtcCoinbasePayload');

function updateProgress(currentIndex, totalCount) {
    process.stdout.write(`Fetching transactions: ${currentIndex}/${totalCount}\r`);
}

function clearProgress() {
    process.stdout.write('\x1b[2K\r');
}

/**
 * Fetches each tx hex from mempool.space (via `getTransactionWithRetry`), with delay between requests.
 *
 * @param {Object} transactionsClient - must provide `getTxHex({ txid })`.
 * @param {string[]} txIds
 * @returns {Promise<bitcoinJs.Transaction[]>}
 */
const getTransactionsForTxidsFromMempool = async (transactionsClient, txIds) => {
    if (txIds.length === 0) {
        console.log('No transactions found in the block.');
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

const getInformationReadyForRegisterBtcCoinbaseTransactionFromMempool = async (network, txHash) => {
    const { blocks, transactions } = createMempoolBitcoinClients(network);

    const { blockHash, blockTxids } = await getBlockInfoByTransactionHash(blocks, transactions, txHash, {
        unconfirmedBlockDetail: 'in mempool.space response',
    });

    const txs = await getTransactionsForTxidsFromMempool(transactions, blockTxids);
    return buildRegisterCoinbaseResultFromBlockTxs(blockHash, blockTxids, txs);
};

const getInformationReadyForRegisterBtcCoinbaseTransactionFromBitcoind = async (txHash) => {
    const { blocks, transactions } = createBitcoindClients();
    const { blockHash, blockTxids } = await getBlockInfoByTransactionHash(blocks, transactions, txHash, {
        unconfirmedBlockDetail: 'from Bitcoin Core (tx not confirmed, wrong network, or txindex disabled)',
    });

    console.log(
        `Found ${blockTxids.length} transactions. Fetching from local bitcoind (no delay between requests)...`,
    );
    const txs = await getTransactionsForTxidsFromBitcoind(transactions, blockTxids, (current, total) => {
        updateProgress(current, total);
    });
    clearProgress();
    console.log(`\nFinished fetching ${blockTxids.length} transactions.`);

    return buildRegisterCoinbaseResultFromBlockTxs(blockHash, blockTxids, txs);
};

const getInformationReadyForRegisterBtcCoinbaseTransaction = async (network, txHash) => {
    if (network === 'regtest') {
        return getInformationReadyForRegisterBtcCoinbaseTransactionFromBitcoind(txHash);
    }
    if (network === 'mainnet' || network === 'testnet') {
        return getInformationReadyForRegisterBtcCoinbaseTransactionFromMempool(network, txHash);
    }
    throw new Error(
        `Unsupported network "${network}". Use mainnet, testnet, or regtest.`,
    );
};

(async () => {
    try {
        const { network, txHash } = parseBridgeRegisterBtcCliArgs(
            process.argv,
            'Usage: node tool/getInformationReadyForRegisterBtcCoinbaseTransaction.js <mainnet|testnet|regtest> <btcTxHashInBlock>',
        );

        const informationReadyForRegisterBtcCoinbaseTransaction =
            await getInformationReadyForRegisterBtcCoinbaseTransaction(network, txHash);

        console.log(
            'Transaction Information ready for registerBtcCoinbaseTransaction: ',
            informationReadyForRegisterBtcCoinbaseTransaction,
        );
    } catch (e) {
        console.log(e);
    }
})();
