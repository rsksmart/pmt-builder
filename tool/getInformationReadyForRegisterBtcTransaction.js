const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getWtxids, getTransactionWithRetry, getBlockInfoByTransactionHash } = require("./pmt-builder-utils");

const getInformationReadyForRegisterBtcTransaction = async (network, txHash) => {
    const { bitcoin: { blocks, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const { blockHeight, blockTxids } = await getBlockInfoByTransactionHash(blocks, transactions, txHash);
    const resultPmt = pmtBuilder.buildPMT(blockTxids, txHash);
    const pmt = resultPmt.hex;

    const { blockWtxids, targetWtxid } = await getWtxids(transactions, blockTxids, txHash);
    const resultPmtConsideringWitness = pmtBuilder.buildPMT(blockWtxids, targetWtxid);
    const pmtConsideringWitness = resultPmtConsideringWitness.hex;
    const rawTargetBtcTransaction = await getTransactionWithRetry(transactions, txHash);

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
