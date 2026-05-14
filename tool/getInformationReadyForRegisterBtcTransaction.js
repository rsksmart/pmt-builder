const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '..', '.env'),
    quiet: true,
});

const pmtBuilder = require('../index');
const bitcoin = require('bitcoinjs-lib');
const { createMempoolBitcoinClients } = require('./mempool-api-client');
const { createBitcoindClients } = require('./bitcoin/bitcoindBitcoinClients');
const { fetchBlockWtxidsWithTargetWtxid } = require('./pmt-builder-utils');
const { getBitcoinTransactionDataForPmt } = require('./bitcoin/transactionDataForPmt');
const { isMempoolNetwork } = require('./bitcoin/networks');
const { parseBridgeRegisterBtcCliArgs } = require('./bitcoin/registerBtcCliArgs');

const getInformationReadyForRegisterBtcTransaction = async (network, txHash) => {
    const {
        rawHex: rawTargetBtcTransaction,
        blockHeight,
        blockTxids,
    } = await getBitcoinTransactionDataForPmt(txHash, network);

    const targetTx = bitcoin.Transaction.fromHex(rawTargetBtcTransaction);
    const hasWitness = targetTx.hasWitnesses();

    let resultPmt;
    if (hasWitness) {
        const { transactions } = isMempoolNetwork(network)
            ? createMempoolBitcoinClients(network)
            : createBitcoindClients();
        const { blockWtxids, targetWtxid } = await fetchBlockWtxidsWithTargetWtxid(
            transactions,
            blockTxids,
            txHash,
        );
        resultPmt = pmtBuilder.buildPMT(blockWtxids, targetWtxid);
    } else {
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
