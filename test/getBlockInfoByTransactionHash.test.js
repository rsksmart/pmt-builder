const { getBlockInfoByTransactionHash } = require('../tool/pmt-builder-utils');

let expect;

before(async function loadChai() {
    const chai = await import('chai');
    expect = chai.expect;
});

describe('getBlockInfoByTransactionHash', () => {
    const txHash = 'a'.repeat(64);
    const blockTxids = ['coinbase', 'other'];

    it('returns block metadata for a confirmed tx', async () => {
        const blocks = {
            getBlockTxids: async ({ hash }) => {
                expect(hash).to.equal('blk1');
                return blockTxids;
            },
        };
        const transactions = {
            getTx: async ({ txid }) => {
                expect(txid).to.equal(txHash);
                return { status: { block_hash: 'blk1', block_height: 42 } };
            },
        };

        const result = await getBlockInfoByTransactionHash(blocks, transactions, txHash);
        expect(result).to.deep.equal({
            blockHash: 'blk1',
            blockHeight: 42,
            blockTxids,
        });
    });

    it('throws with default unconfirmed detail when tx has no block', async () => {
        const blocks = {
            getBlockTxids: async () => {
                throw new Error('getBlockTxids should not be called for unconfirmed tx');
            },
        };
        const transactions = {
            getTx: async () => ({ status: {} }),
        };
        try {
            await getBlockInfoByTransactionHash(blocks, transactions, txHash);
            expect.fail('expected throw');
        } catch (e) {
            expect(e.message).to.include('in API response');
        }
    });

    it('throws with custom unconfirmed detail when provided', async () => {
        const blocks = {
            getBlockTxids: async () => {
                throw new Error('getBlockTxids should not be called for unconfirmed tx');
            },
        };
        const transactions = {
            getTx: async () => ({ status: { block_hash: 'x', block_height: null } }),
        };
        try {
            await getBlockInfoByTransactionHash(blocks, transactions, txHash, {
                unconfirmedBlockDetail: 'in mempool.space response',
            });
            expect.fail('expected throw');
        } catch (e) {
            expect(e.message).to.include('in mempool.space response');
        }
    });
});
