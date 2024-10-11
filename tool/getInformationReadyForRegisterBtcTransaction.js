const mempoolJS = require("@mempool/mempool.js");
const pmtBuilder = require("../index");

const getInformationReadyForRegisterBtcTransaction = async (transactionHash, network = 'testnet') => {

    const { bitcoin: { blocks, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network // 'testnet' | 'mainnet'
    });

    const transaction = await transactions.getTx({ txid: transactionHash });
    const blockHash = transaction.status.block_hash;
    const blockHeight = transaction.status.block_height;

    const blockTxids = await blocks.getBlockTxids({ hash: blockHash });
    const rawBtcTransaction = await transactions.getTxHex({ txid: transactionHash });

    const resultPmt = pmtBuilder.buildPMT(blockTxids, transactionHash);

    const pmt = resultPmt.hex;

    const informationReadyForRegisterBtcTransaction = {
        network,
        blockHash,
        transactionHash,
        tx: `0x${rawBtcTransaction}`,
        height: blockHeight,
        pmt: `0x${pmt}`,
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

