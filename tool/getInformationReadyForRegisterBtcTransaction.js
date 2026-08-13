const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '..', '.env'),
    quiet: true,
});

const pmtBuilder = require('../index');
const bitcoin = require('bitcoinjs-lib');
const { createMempoolBitcoinClients } = require('./mempool-api-client');
const { createBitcoindClients } = require('./bitcoin/bitcoindClients');
const { fetchBlockWtxidsWithTargetWtxid } = require('./pmt-builder-utils');
const { getBitcoinTransactionDataForPmt } = require('./bitcoin/transactionDataForPmt');
const { isMempoolNetwork } = require('./bitcoin/networks');
const { parseBridgeRegisterBtcCliArgs } = require('./bitcoin/registerBtcCliArgs');
const {
    createProgressReporter,
    logFetchTransactionsComplete,
} = require('./bitcoin/cliProgress');

const reportWtxidFetchProgress = createProgressReporter('Fetching transactions for wtxids');

const getInformationReadyForRegisterBtcTransaction = async (network, txHash) => {
    console.log(`Fetching transaction ${txHash} on ${network}...`);

    const {
        rawHex: rawTargetBtcTransaction,
        blockHeight,
        blockTxids,
    } = await getBitcoinTransactionDataForPmt(txHash, network);

    console.log(
        `Found ${blockTxids.length} transactions in block at height ${blockHeight}.`,
    );

    const targetTx = bitcoin.Transaction.fromHex(rawTargetBtcTransaction);
    const hasWitness = targetTx.hasWitnesses();

    let resultPmt;
    if (hasWitness) {
        const { transactions } = isMempoolNetwork(network)
            ? createMempoolBitcoinClients(network)
            : createBitcoindClients();
        console.log(
            'SegWit transaction: fetching each transaction in the block to compute wtxids...',
        );
        const { blockWtxids, targetWtxid } = await fetchBlockWtxidsWithTargetWtxid(
            transactions,
            blockTxids,
            txHash,
            reportWtxidFetchProgress,
        );
        logFetchTransactionsComplete(blockTxids.length, 'Building PMT...');
        resultPmt = pmtBuilder.buildPMT(blockWtxids, targetWtxid);
    } else {
        console.log('Non-SegWit transaction: building PMT from block txids (no extra fetches).');
        resultPmt = pmtBuilder.buildPMT(blockTxids, txHash);
    }

    const informationReadyForRegisterBtcTransaction = {
        tx: `0x${rawTargetBtcTransaction}`,
        height: blockHeight,
        pmt: `0x${resultPmt.hex}`,
    };

    return informationReadyForRegisterBtcTransaction;
};

(async () => {
    try {
        const { network, txHash } = parseBridgeRegisterBtcCliArgs(
            process.argv,
            'Usage: node tool/getInformationReadyForRegisterBtcTransaction.js <mainnet|testnet|regtest> <btcTransactionHash>',
        );

        const informationReadyForRegisterBtcTransaction =
            await getInformationReadyForRegisterBtcTransaction(network, txHash);

        console.log(
            'Transaction Information ready for registerBtcTransaction: ',
            informationReadyForRegisterBtcTransaction,
        );
    } catch (e) {
        console.log(e);
    }
})();
