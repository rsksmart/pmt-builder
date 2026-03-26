const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    quiet: true,
});

const pmtBuilder = require("../index");
const { getBitcoinTransactionDataForPmt } = require("./lib/bitcoinTransactionDataForPmt");

const getInformationReadyForRegisterBtcTransaction = async (transactionHash, network) => {

    const { rawHex, blockHeight, blockTxids } = await getBitcoinTransactionDataForPmt(
        transactionHash,
        network
    );

    const resultPmt = pmtBuilder.buildPMT(blockTxids, transactionHash);

    const pmt = resultPmt.hex;

    const informationReadyForRegisterBtcTransaction = {
        tx: `0x${rawHex}`,
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
