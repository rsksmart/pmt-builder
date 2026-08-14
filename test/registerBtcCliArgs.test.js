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

    describe('--send flag', () => {
        it('defaults send to false when the flag is absent', () => {
            const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', 'testnet', validTxid]);
            expect(validationResult.ok).to.equal(true);
            expect(validationResult.send).to.equal(false);
        });

        it('sets send when the flag is passed after the filtered args', () => {
            const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', 'testnet', validTxid, '--send']);
            expect(validationResult.ok).to.equal(true);
            expect(validationResult.send).to.equal(true);
        });

        it('sets send when the flag is passed before the filtered args', () => {
            const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', '--send', 'testnet', validTxid]);
            expect(validationResult.ok).to.equal(true);
            expect(validationResult.network).to.equal('testnet');
            expect(validationResult.txHash).to.equal(validTxid);
            expect(validationResult.send).to.equal(true);
        });

        it('rejects an unknown flag instead of silently dry-running', () => {
            const validationResult = validateBridgeRegisterBtcCliArgs(['node', 'x.js', 'testnet', validTxid, '--sned']);
            expect(validationResult.ok).to.equal(false);
            expect(validationResult.reason).to.equal('unknown_flag');
            expect(validationResult.flag).to.equal('--sned');
        });
    });
});
