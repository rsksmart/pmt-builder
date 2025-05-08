const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");

const getPmtInformation = async (network, txHash) => {

    const { bitcoin: { blocks, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const transaction = await transactions.getTx({ txid: txHash });
    const blockHash = transaction.status.block_hash;

    const blockTxids = await blocks.getBlockTxids({ hash: blockHash });

    const resultPmt = pmtBuilder.buildPMT(blockTxids, txHash);

    return resultPmt;

};

(async () => {
    try {
        const network = process.argv[2];
        const txHash = process.argv[3];

        const pmtInformation = await getPmtInformation(network, txHash);

        console.log('PMT information: ', pmtInformation);

    } catch (e) {
        console.log(e);
    }
})();
