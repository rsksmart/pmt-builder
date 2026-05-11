const MEMPOOL_HOST = 'mempool.space';

/**
 * @param {'mainnet' | 'testnet'} network
 * @returns {string}
 */
function getApiBase(network) {
    if (network === 'mainnet') {
        return `https://${MEMPOOL_HOST}/api`;
    }
    if (network === 'testnet') {
        return `https://${MEMPOOL_HOST}/testnet/api`;
    }
    throw new Error(`Unsupported network: ${network}. Use 'mainnet' or 'testnet'.`);
}

/**
 * @param {number} status
 * @param {string} [body]
 * @returns {string}
 */
function createHttpErrorMessage(status, body) {
    if (status === 429) {
        return 'Too Many Requests';
    }
    if (body && body.length < 500) {
        return `Mempool API HTTP ${status}: ${body}`;
    }
    return `Mempool API HTTP ${status}`;
}

/**
 * @param {number} status
 * @param {string} [body]
 * @returns {Error & { response: { status: number } }}
 */
function createHttpError(status, body) {
    const err = new Error(createHttpErrorMessage(status, body));
    err.response = { status };
    return err;
}

/**
 * @param {string} url
 * @returns {Promise<unknown>}
 */
async function fetchJson(url) {
    const response = await fetch(url);
    const responseText = await response.text();
    if (!response.ok) {
        throw createHttpError(response.status, responseText);
    }
    if (!responseText) {
        return null;
    }
    return JSON.parse(responseText);
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
    const response = await fetch(url);
    const responseText = await response.text();
    if (!response.ok) {
        throw createHttpError(response.status, responseText);
    }
    return responseText.trim();
}

/**
 * Bitcoin Mempool Space REST clients compatible with {@link ./pmt-builder-utils.js} expectations.
 *
 * @param {'mainnet' | 'testnet'} network
 * @returns {{ blocks: { getBlockTxids: function }, transactions: { getTx: function, getTxHex: function } }}
 */
function createMempoolBitcoinClients(network) {
    const base = getApiBase(network);

    const transactions = {
        /**
         * @param {{ txid: string }} params
         * @returns {Promise<Record<string, unknown>>}
         */
        async getTx({ txid }) {
            const url = `${base}/tx/${encodeURIComponent(txid)}`;
            return fetchJson(url);
        },

        /**
         * @param {{ txid: string }} params
         * @returns {Promise<string>}
         */
        async getTxHex({ txid }) {
            const url = `${base}/tx/${encodeURIComponent(txid)}/hex`;
            return fetchText(url);
        },
    };

    const blocks = {
        /**
         * @param {{ hash: string }} params
         * @returns {Promise<string[]>}
         */
        async getBlockTxids({ hash }) {
            const url = `${base}/block/${encodeURIComponent(hash)}/txids`;
            const data = await fetchJson(url);
            if (!Array.isArray(data)) {
                throw new Error('Mempool API: expected array of txids from block/txids');
            }
            return data;
        },
    };

    return { blocks, transactions };
}

module.exports = { createMempoolBitcoinClients, getApiBase };
