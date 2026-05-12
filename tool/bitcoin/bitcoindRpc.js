/**
 * Minimal Bitcoin Core JSON-RPC client (HTTP POST).
 * Configure via BITCOIND_RPC_URL (default http://127.0.0.1:18443, Bitcoin Core regtest JSON-RPC; 18444 is the default regtest P2P port) and
 * BITCOIND_RPC_USER / BITCOIND_RPC_PASSWORD.
 */

/** getrawtransaction verbosity: decode to JSON (includes hex, blockhash, …). */
const RPC_GETRAWTRANSACTION_DECODE = true;

/** getrawtransaction: return raw hex string only. */
const RPC_GETRAWTRANSACTION_HEX = false;

/** getblock verbosity: JSON with `tx` as array of txids (not full transactions). */
const RPC_GETBLOCK_TXID_LIST = 1;

async function bitcoindRpc(method, params = []) {
    const url = process.env.BITCOIND_RPC_URL || 'http://127.0.0.1:18443';
    const user = process.env.BITCOIND_RPC_USER || '';
    const password = process.env.BITCOIND_RPC_PASSWORD || '';

    const headers = {
        'Content-Type': 'application/json',
    };
    // Either field set → send Authorization (Core often uses both; some setups use one).
    if (user !== '' || password !== '') {
        const token = Buffer.from(`${user}:${password}`, 'utf8').toString('base64');
        headers.Authorization = `Basic ${token}`;
    }

    const body = JSON.stringify({
        jsonrpc: '1.0',
        id: 'pmt-builder',
        method,
        params,
    });

    const res = await fetch(url, { method: 'POST', headers, body });
    const responseText = await res.text();

    if (!res.ok) {
        const preview = responseText.length > 500 ? `${responseText.slice(0, 500)}…` : responseText;
        throw new Error(`bitcoind RPC HTTP ${res.status} ${res.statusText} for ${method}: ${preview || '(empty body)'}`);
    }

    let json;
    try {
        json = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
        throw new Error(
            `bitcoind RPC ${method}: response was not JSON (HTTP ${res.status}). Body starts: ${responseText.slice(0, 200)}`,
        );
    }

    if (!json || typeof json !== 'object') {
        throw new Error(`bitcoind RPC ${method}: empty or invalid JSON-RPC body (HTTP ${res.status})`);
    }

    if (json.error) {
        const msg = json.error.message || JSON.stringify(json.error);
        throw new Error(`bitcoind RPC ${method}: ${msg}`);
    }

    return json.result;
}

module.exports = {
    bitcoindRpc,
    RPC_GETRAWTRANSACTION_DECODE,
    RPC_GETRAWTRANSACTION_HEX,
    RPC_GETBLOCK_TXID_LIST,
};
