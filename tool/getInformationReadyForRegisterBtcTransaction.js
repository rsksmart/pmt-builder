const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getWtxid, sleep, getTransactionWithRetry } = require("./pmt-builder-utils");

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

    const blockWtxids = [];
    for (let i = 0; i < blockTxids.length; i++) {
        const txid = blockTxids[i];
        const rawTx = await getTransactionWithRetry(transactionsClient, txid);

        if (!rawTx) {
            throw new Error(`Failed to fetch transaction details for txId: ${txid}. It might not exist or is malformed.`);
        }

        const wtxid = getWtxid(rawTx);
        blockWtxids.push(wtxid);

        if (i < blockTxids.length - 1) {
            await sleep();
        }
    }

    const resultPmt = pmtBuilder.buildPMT(blockTxids, transactionHash);
    const pmt = resultPmt.hex;
    const blockHeight = transaction.status.block_height;
    const rawTargetBtcTransaction = await getTransactionWithRetry(transactionsClient, transactionHash);

    if (!rawTargetBtcTransaction) {
        throw new Error(`Failed to fetch transaction details for txId: ${transactionHash}. It might not exist or is malformed.`);
    }

    const targetWtxid = getWtxid(rawTargetBtcTransaction);

    const resultPmtConsideringWitness = pmtBuilder.buildPMT(blockWtxids, targetWtxid);
    const pmtConsideringWitness = resultPmtConsideringWitness.hex;

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
