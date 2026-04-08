const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");
const { getBlockWtxidsWithTargetWtxidByTransactionHash } = require("./pmt-builder-utils");

const getPmtInformationWithWitness = async (network, txHash) => {
    const { bitcoin: { blocks, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const { blockWtxids, targetWtxid } = await getBlockWtxidsWithTargetWtxidByTransactionHash(blocks, transactions, txHash);
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
