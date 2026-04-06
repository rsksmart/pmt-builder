const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getWtxids } = require("./pmt-builder-utils");

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
    
    const { blockWtxids, targetWtxid } = await getWtxids(transactionsClient, blockTxIds, txHash);
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
