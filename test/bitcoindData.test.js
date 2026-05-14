const { getTransactionsForTxidsFromBitcoind } = require('../tool/bitcoin/bitcoindData');

let expect;

before(async function loadChai() {
    const chai = await import('chai');
    expect = chai.expect;
});

describe('getTransactionsForTxidsFromBitcoind', () => {
    it('returns decoded txs in order and reports progress', async () => {
        const calls = [];
        const transactions = {
            getTxHex: async ({ txid }) => {
                calls.push(txid);
                if (txid === 'aa') {
                    return '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0100ffffffff0100f2052a010000001976a9143744841e19b57b4c059c14f0eb427a003ad21e1c88ac00000000';
                }
                if (txid === 'bb') {
                    return '0100000001a374ca4a08a89e16c4a307efc9cf84e16a89ac7b5f86753042426b7b52ccb7f30000000048473044022001145ea5266f36c3ea55fccc047009596803dafb2a09b64f384547b2a183a406022063cbe71b7d876c2ad169338a357e2d2cf8e6a129f2591c9b1c417a0d6b93f37301ffffffff0100e1f505000000001976a91470c44cef12cdd0aa8045f559e2e8446a510f339c88ac00000000';
                }
                throw new Error(`unexpected txid ${txid}`);
            },
        };
        const progress = [];
        const txids = ['aa', 'bb'];
        const txs = await getTransactionsForTxidsFromBitcoind(transactions, txids, (cur, total) => {
            progress.push([cur, total]);
        });

        expect(calls).to.deep.equal(['aa', 'bb']);
        expect(progress).to.deep.equal([
            [1, 2],
            [2, 2],
        ]);
        expect(txs).to.have.length(2);
        expect(txs[0].getId()).to.match(/^[0-9a-f]{64}$/);
        expect(txs[1].getId()).to.match(/^[0-9a-f]{64}$/);
    });

    it('returns empty array for empty txids', async () => {
        const transactions = {
            getTxHex: async () => {
                throw new Error('should not be called');
            },
        };
        const txs = await getTransactionsForTxidsFromBitcoind(transactions, []);
        expect(txs).to.deep.equal([]);
    });
});
