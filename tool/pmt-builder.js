const pmtBuilder = require("../index");
const fetchBlockTxIds = require("../helper");

(async () => {
    try {
        const network = process.argv[2];
        const hash = process.argv[3];
        const txHash = process.argv[4];

        const blockTxids = await fetchBlockTxIds(network, hash);
        const resultPmt = pmtBuilder.buildPMT(blockTxids, txHash);

        console.log("Block Transactions Ids:", blockTxids);
        console.log("Filtered Hash:", txHash);
        console.log("Result:", resultPmt);
    } catch (e) {
        console.log(e);
    }
})();
