const mempoolJS = require("@mempool/mempool.js");
const { buildPMT, getWtxid } = require("../index");

const getPmtInformationWithWitness = async (network, txHash) => {
    const { bitcoin: { blocks, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });
    
    const transaction = await transactions.getTx({ txid: txHash });

    const blockHash = transaction.status.block_hash;
    const blockTxIds = await blocks.getBlockTxids({ hash: blockHash });
    
    const blockWtxids = [];
    for (const txid of blockTxIds) {
        const rawTx = await transactions.getTxHex({ txid });
        const wtxid = await getWtxid(rawTx);
        blockWtxids.push(wtxid);
    }

    const rawTx = await transactions.getTxHex({ txid: txHash });
    const targetTxWTxId = await getWtxid(rawTx);
    const resultPmt = buildPMT(blockWtxids, targetTxWTxId);

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
