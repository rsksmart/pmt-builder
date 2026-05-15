const bitcoin = require('bitcoinjs-lib');
const {
    witnessMerkleRootHexFromBlockTxs,
    buildRegisterCoinbaseResultFromBlockTxs,
} = require('../tool/bitcoin/registerBtcCoinbasePayload');

let expect;

before(async function loadChai() {
    const chai = await import('chai');
    expect = chai.expect;
});

/** Testnet witness tx from existing PMT tests (wtxid used only for non-coinbase leaves). */
const WITNESS_TX_HEX =
    '02000000000101fc11ed2e485faf6370461ec09b61e1d65d3e4f40dba26a6926356ec859436fac0100000023220020f8e08a83ad7e3ce13df880cdea97aba6d145b6244ead9f8512b159ebea15be55ffffffff02e8a31e00000000001976a914cab5925c59a9a413f8d443000abcc5640bdf067588acc00130030000000017a9147214a88d8e15f5a09050bff1d1a85f19d6e3b820870500473044022042a5bb9a1eb34b56a16602a4b29e6f594d82cf68a7758e05ccb2556396574b9802202900553564e44ca4e4718cae91767db380d20f2e6d0dd7fbcd9599eee5713d5101473044022043d7fe49578ff16e8abfda7951bad1aeb9c0a93d5157367ea03e09101c0d3770022061270ce8edfa9dae3e5e135d8673dd16f6c646c480cca42a11fe83f2960833710100db6452210379d78dcae0be90715a088413c588da6a9381aae42e504f6e05c7b5204ed5bf3a2103d9d48cdc0fdf039d08371c64b1e86e1715e9898d4680595f1d4e3398dbdd9e9e2103df89bd3d49c1ebdef2e9b4e77c84e048dbbcf7c41735b073a68fdcf5d086bd2853ae670350cd00b27552210216c23b2ea8e4f11c3f9e22711addb1d16a93964796913830856b568cc3ea21d3210275562901dd8faae20de0a4166362a4f82188db77dbed4ca887422ea1ec185f1421034db69f2112f4fb1bb6141bf6e2bd6631f0484d0bd95b16767902c9fe219d4a6f53ae6800000000';

describe('registerBtcCoinbasePayload', () => {
    describe('witnessMerkleRootHexFromBlockTxs', () => {
        it('uses BIP141 zero coinbase leaf plus wtxids for remaining txs', () => {
            const tx2 = bitcoin.Transaction.fromHex(WITNESS_TX_HEX);
            const root = witnessMerkleRootHexFromBlockTxs([{}, tx2]);
            expect(root).to.equal('07e84f96107bffdd5a02a93a27f8ace08e3c7aec1568850722a737083ee3b1e1');
        });

        it('for a single-tx block witness tree is one zero leaf', () => {
            const root = witnessMerkleRootHexFromBlockTxs([bitcoin.Transaction.fromHex(WITNESS_TX_HEX)]);
            expect(root).to.equal('0'.repeat(64));
        });

        it('throws when txs is empty', () => {
            expect(() => witnessMerkleRootHexFromBlockTxs([])).to.throw(
                'Block has no transactions for witness merkle root computation.',
            );
        });
    });

    describe('buildRegisterCoinbaseResultFromBlockTxs', () => {
        it('throws when there is no coinbase', () => {
            expect(() =>
                buildRegisterCoinbaseResultFromBlockTxs('00'.repeat(32), [], []),
            ).to.throw('Block has no coinbase transaction.');
        });
    });
});
