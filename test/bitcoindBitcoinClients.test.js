const { createBitcoindBitcoinClients } = require('../tool/bitcoin/bitcoindBitcoinClients');

let expect;

before(async function loadChai() {
    const chai = await import('chai');
    expect = chai.expect;
});

describe('createBitcoindBitcoinClients', () => {
    it('returns mempool-compatible blocks and transactions clients', () => {
        const { blocks, transactions } = createBitcoindBitcoinClients();
        expect(blocks.getBlockTxids).to.be.a('function');
        expect(transactions.getTx).to.be.a('function');
        expect(transactions.getTxHex).to.be.a('function');
    });
});
