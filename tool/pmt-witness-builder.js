const pmtBuilder = require("../index");
const { createMempoolBitcoinClients } = require("./mempool-api-client");
const { getBlockWtxidsWithTargetWtxidByTransactionHash } = require("./pmt-builder-utils");

const getPmtInformationWithWitness = async (network, txHash) => {
    const { blocks, transactions } = createMempoolBitcoinClients(network);

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
