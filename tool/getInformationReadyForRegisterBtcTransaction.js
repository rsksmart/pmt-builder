const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const bitcoin = require('bitcoinjs-lib');
const { fetchBlockWtxidsWithTargetWtxid, getTransactionWithRetry, getBlockInfoByTransactionHash } = require("./pmt-builder-utils");

const getInformationReadyForRegisterBtcTransaction = async (network, txHash) => {
    const { bitcoin: { blocks, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const { blockHeight, blockTxids } = await getBlockInfoByTransactionHash(blocks, transactions, txHash);
    const rawTargetBtcTransaction = await getTransactionWithRetry(transactions, txHash);
    const targetTx = bitcoin.Transaction.fromHex(rawTargetBtcTransaction);
    const hasWitness = targetTx.hasWitnesses();

    let resultPmt;
    if (hasWitness) {
        const { blockWtxids, targetWtxid } = await fetchBlockWtxidsWithTargetWtxid(transactions, blockTxids, txHash);
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
        const network = process.argv[2];
        const txHash = process.argv[3];

        const informationReadyForRegisterBtcTransaction = await getInformationReadyForRegisterBtcTransaction(network, txHash);

        console.log('Transaction Information ready for registerBtcTransaction: ', informationReadyForRegisterBtcTransaction);

    } catch (e) {
        console.log(e);
    }
})();
