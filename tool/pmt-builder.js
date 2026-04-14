const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getBlockTxidsByTransactionHash } = require("./pmt-builder-utils");

const getPmtInformation = async (network, txHash) => {
    const { bitcoin: { blocks, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const blockTxids = await getBlockTxidsByTransactionHash(blocks, transactions, txHash);
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
