const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getWtxid, sleep, getTransactionWithRetry } = require("./pmt-builder-utils");

const getPmtInformationWithWitness = async (network, txHash) => {
    const bitcoin = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const transactionsClient = bitcoin.bitcoin.transactions;
    const blocksClient = bitcoin.bitcoin.blocks;
    
    const transaction = await transactionsClient.getTx({ txid: txHash });

    const blockHash = transaction.status.block_hash;
    const blockTxIds = await blocksClient.getBlockTxids({ hash: blockHash });
    
    const blockWtxids = [];
    for (let i = 0; i < blockTxIds.length; i++) {
        const txid = blockTxIds[i];
        const rawTx = await getTransactionWithRetry(transactionsClient, txid);

        if (!rawTx) {
            throw new Error(`Failed to fetch transaction details for txId: ${txid}. It might not exist or is malformed.`);
        }

        const wtxid = getWtxid(rawTx);
        blockWtxids.push(wtxid);

        if (i < blockTxIds.length - 1) {
            await sleep();
        }
    }

    const rawTx = await getTransactionWithRetry(transactionsClient, txHash);

    if (!rawTx) {
        throw new Error(`Failed to fetch transaction details for txId: ${txHash}. It might not exist or is malformed.`);
    }

    const targetWtxid = getWtxid(rawTx);
    const resultPmt = pmtBuilder.buildPMT(blockWtxids, targetWtxid);

    return resultPmt;
};

(async () => {
    try {
        const network = process.argv[2];
        const txHash = process.argv[3];

        const pmtInformation = await getPmtInformationWithWitness(network, txHash);

        console.log('PMT information considering wtxid: ', pmtInformation);

    } catch (e) {
        console.log(e);
    }
})();
