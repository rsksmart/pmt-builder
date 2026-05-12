const { getBitcoinTransactionDataForPmt } = require('../tool/bitcoin/transactionDataForPmt');
const { isMempoolNetwork, MEMPOOL_NETWORKS } = require('../tool/bitcoin/networks');

let expect;

before(async function loadChai() {
    const chai = await import('chai');
    expect = chai.expect;
});

describe('tool/bitcoin/networks', () => {
    it('treats mainnet and testnet as mempool-backed', () => {
        expect(isMempoolNetwork('mainnet')).to.equal(true);
        expect(isMempoolNetwork('testnet')).to.equal(true);
        expect(isMempoolNetwork('regtest')).to.equal(false);
        expect(MEMPOOL_NETWORKS.size).to.equal(2);
    });
});

describe('getBitcoinTransactionDataForPmt', () => {
    it('throws for unsupported networks', async () => {
        try {
            await getBitcoinTransactionDataForPmt('0'.repeat(64), 'signet');
            expect.fail('expected rejection');
        } catch (e) {
            expect(e.message).to.match(/Unsupported network "signet"/);
        }
    });
});
