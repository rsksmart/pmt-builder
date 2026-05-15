const { createBitcoindClients } = require('../tool/bitcoin/bitcoindBitcoinClients');

let expect;

before(async function loadChai() {
    const chai = await import('chai');
    expect = chai.expect;
});

describe('createBitcoindClients', () => {
    it('returns mempool-compatible blocks and transactions clients', () => {
        const { blocks, transactions } = createBitcoindClients();
        expect(blocks.getBlockTxids).to.be.a('function');
        expect(transactions.getTx).to.be.a('function');
        expect(transactions.getTxHex).to.be.a('function');
    });
});
