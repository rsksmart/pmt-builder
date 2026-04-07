const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getWtxids, getTransactionWithRetry } = require("./pmt-builder-utils");

const getInformationReadyForRegisterBtcTransaction = async (network, txHash) => {
    const bitcoin = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const transactionsClient = bitcoin.bitcoin.transactions;
    const transaction = await transactionsClient.getTx({ txid: txHash });

    const blockHash = transaction.status.block_hash;
    const blocksClient = bitcoin.bitcoin.blocks;
    const blockTxids = await blocksClient.getBlockTxids({ hash: blockHash });

    const resultPmt = pmtBuilder.buildPMT(blockTxids, txHash);
    const pmt = resultPmt.hex;
    const blockHeight = transaction.status.block_height;

    const { blockWtxids, targetWtxid } = await getWtxids(transactionsClient, blockTxids, txHash);
    const resultPmtConsideringWitness = pmtBuilder.buildPMT(blockWtxids, targetWtxid);
    const pmtConsideringWitness = resultPmtConsideringWitness.hex;
    const rawTargetBtcTransaction = await getTransactionWithRetry(transactionsClient, txHash);

    const informationReadyForRegisterBtcTransaction = {
        tx: `0x${rawTargetBtcTransaction}`,
        height: blockHeight,
        pmt: `0x${pmt}`,
        pmtConsideringWitness: `0x${pmtConsideringWitness}`,
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
