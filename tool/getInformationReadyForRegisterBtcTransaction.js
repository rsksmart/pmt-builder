const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getWtxid } = require("./pmt-builder-utils");

const getInformationReadyForRegisterBtcTransaction = async (transactionHash, network) => {

    const { bitcoin: { blocks, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const transaction = await transactions.getTx({ txid: transactionHash });
    const blockHash = transaction.status.block_hash;
    const blockHeight = transaction.status.block_height;

    const blockTxids = await blocks.getBlockTxids({ hash: blockHash });
    const rawBtcTransaction = await transactions.getTxHex({ txid: transactionHash });

    const blockTxWids = [];

    for (const txid of blockTxids) {
        const rawTx = await transactions.getTxHex({ txid });
        const wTxId = await getWtxid(rawTx);
        blockTxWids.push(wTxId);
    }

    const resultPmt = pmtBuilder.buildPMT(blockTxids, transactionHash);
    const pmt = resultPmt.hex;

    const targetTxWTxId = await getWtxid(rawBtcTransaction);
    const resultPmtConsideringWitness = pmtBuilder.buildPMT(blockTxWids, targetTxWTxId);
    const pmtConsideringWitness = resultPmtConsideringWitness.hex;

    const informationReadyForRegisterBtcTransaction = {
        tx: `0x${rawBtcTransaction}`,
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

module.exports = { getInformationReadyForRegisterBtcTransaction };
