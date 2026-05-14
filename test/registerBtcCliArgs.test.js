const { validateBridgeRegisterBtcCliArgs } = require('../tool/bitcoin/registerBtcCliArgs');

let expect;

before(async function loadChai() {
    const chai = await import('chai');
    expect = chai.expect;
});

const validTxid = 'a'.repeat(64);

describe('validateBridgeRegisterBtcCliArgs', () => {
    it('accepts mainnet, testnet, regtest with 64-hex txid', () => {
        for (const network of ['mainnet', 'testnet', 'regtest']) {
            const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', network, validTxid]);
            expect(validationResult.ok).to.equal(true);
            expect(validationResult.network).to.equal(network);
            expect(validationResult.txHash).to.equal(validTxid);
        }
    });

    it('rejects missing network', () => {
        const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', '', validTxid]);
        expect(validationResult.ok).to.equal(false);
        expect(validationResult.reason).to.equal('missing_args');
    });

    it('rejects missing txHash', () => {
        const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', 'mainnet', '']);
        expect(validationResult.ok).to.equal(false);
        expect(validationResult.reason).to.equal('missing_args');
    });

    it('rejects too-short argv (missing txHash slot)', () => {
        const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', 'mainnet']);
        expect(validationResult.ok).to.equal(false);
        expect(validationResult.reason).to.equal('missing_args');
    });

    it('rejects invalid network', () => {
        const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', 'signet', validTxid]);
        expect(validationResult.ok).to.equal(false);
        expect(validationResult.reason).to.equal('bad_network');
        expect(validationResult.network).to.equal('signet');
    });

    it('rejects non-hex txid', () => {
        const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', 'mainnet', 'g'.repeat(64)]);
        expect(validationResult.ok).to.equal(false);
        expect(validationResult.reason).to.equal('bad_txid');
    });

    it('rejects wrong-length txid', () => {
        const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', 'mainnet', 'ab'.repeat(31)]);
        expect(validationResult.ok).to.equal(false);
        expect(validationResult.reason).to.equal('bad_txid');
    });
});
