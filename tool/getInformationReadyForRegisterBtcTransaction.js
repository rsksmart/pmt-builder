const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    quiet: true,
});

const pmtBuilder = require("../index");
const bitcoin = require("bitcoinjs-lib");
const { createMempoolBitcoinClients } = require("./mempool-api-client");
const { fetchBlockWtxidsWithTargetWtxid } = require("./pmt-builder-utils");
const { getBitcoinTransactionDataForPmt } = require("./bitcoin/bitcoinTransactionDataForPmt");
const { bitcoindRpc } = require("./bitcoin/bitcoindRpc");

const MEMPOOL_NETWORKS = new Set(["mainnet", "testnet"]);

const getInformationReadyForRegisterBtcTransaction = async (network, txHash) => {
    const {
        rawHex: rawTargetBtcTransaction,
        blockHeight,
        blockTxids,
    } = await getBitcoinTransactionDataForPmt(txHash, network);

    const targetTx = bitcoin.Transaction.fromHex(rawTargetBtcTransaction);
    const hasWitness = targetTx.hasWitnesses();

    let resultPmt;
    if (hasWitness) {
        let transactionsClient;
        if (MEMPOOL_NETWORKS.has(network)) {
            const { transactions } = createMempoolBitcoinClients(network);
            transactionsClient = transactions;
        } else if (network === "regtest") {
            transactionsClient = {
                getTxHex: ({ txid }) => bitcoindRpc("getrawtransaction", [txid, false]),
            };
        } else {
            throw new Error(
                `Witness transactions are not supported for network "${network}".`,
            );
        }
        const { blockWtxids, targetWtxid } = await fetchBlockWtxidsWithTargetWtxid(
            transactionsClient,
            blockTxids,
            txHash,
        );
        resultPmt = pmtBuilder.buildPMT(blockWtxids, targetWtxid);
    } else {
        resultPmt = pmtBuilder.buildPMT(blockTxids, txHash);
    }

    const informationReadyForRegisterBtcTransaction = {
        tx: `0x${rawTargetBtcTransaction}`,
        height: blockHeight,
        pmt: `0x${resultPmt.hex}`,
    };

    return informationReadyForRegisterBtcTransaction;
};

(async () => {
    try {
        const network = process.argv[2];
        const txHash = process.argv[3];

        const informationReadyForRegisterBtcTransaction =
            await getInformationReadyForRegisterBtcTransaction(network, txHash);

        console.log(
            "Transaction Information ready for registerBtcTransaction: ",
            informationReadyForRegisterBtcTransaction,
        );
    } catch (e) {
        console.log(e);
    }
})();
