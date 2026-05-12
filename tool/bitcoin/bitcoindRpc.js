/**
 * Minimal Bitcoin Core JSON-RPC client (HTTP POST).
 * Configure via BITCOIND_RPC_URL (default http://127.0.0.1:18444) and
 * BITCOIND_RPC_USER / BITCOIND_RPC_PASSWORD.
 */

async function bitcoindRpc(method, params = []) {
    const url = process.env.BITCOIND_RPC_URL || 'http://127.0.0.1:18444';
    const user = process.env.BITCOIND_RPC_USER || '';
    const password = process.env.BITCOIND_RPC_PASSWORD || '';

    const headers = {
        'Content-Type': 'application/json',
    };
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
    const json = await res.json();

    if (json.error) {
        const msg = json.error.message || JSON.stringify(json.error);
        throw new Error(`bitcoind RPC ${method}: ${msg}`);
    }

    return json.result;
}

module.exports = { bitcoindRpc };
