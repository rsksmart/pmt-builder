const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getWtxids, getTransactionWithRetry } = require("./pmt-builder-utils");

const getInformationReadyForRegisterBtcTransaction = async (transactionHash, network) => {
    const bitcoin = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const transactionsClient = bitcoin.bitcoin.transactions;
    const transaction = await transactionsClient.getTx({ txid: transactionHash });

    const blockHash = transaction.status.block_hash;
    const blocksClient = bitcoin.bitcoin.blocks;
    const blockTxids = await blocksClient.getBlockTxids({ hash: blockHash });

    const resultPmt = pmtBuilder.buildPMT(blockTxids, transactionHash);
    const pmt = resultPmt.hex;
    const blockHeight = transaction.status.block_height;

    const { blockWtxids, targetWtxid } = await getWtxids(transactionsClient, blockTxids, transactionHash);
    const resultPmtConsideringWitness = pmtBuilder.buildPMT(blockWtxids, targetWtxid);
    const pmtConsideringWitness = resultPmtConsideringWitness.hex;
    const rawTargetBtcTransaction = await getTransactionWithRetry(transactionsClient, transactionHash);

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
        const transactionHash = process.argv[3];

        const informationReadyForRegisterBtcTransaction = await getInformationReadyForRegisterBtcTransaction(transactionHash, network);

        console.log('Transaction Information ready for registerBtcTransaction: ', informationReadyForRegisterBtcTransaction);

    } catch (e) {
        console.log(e);
    }
})();
