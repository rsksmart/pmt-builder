const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");

(async () => {
    try {
        const network = process.argv[2];
        const hash = process.argv[3];
        const txHash = process.argv[4];

        const { bitcoin: { blocks } } = mempoolJS({
            hostname: 'mempool.space',
            network: network // 'testnet' | 'mainnet'
        });
    
        const blockTxids = await blocks.getBlockTxids({ hash });

        const resultPmt = pmtBuilder.buildPMT(blockTxids, txHash);
        console.log("Block Transactions Ids:", blockTxids);
        console.log("Filtered Hash:", txHash);
        console.log("Result:", resultPmt);
    } catch (e) {
        console.log(e);
    }
})();
