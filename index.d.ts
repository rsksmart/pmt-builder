/**
  * 
  * @param leaves: array of transaction hashes without witness(txid) in a block
  * @param filteredHash: transaction hash
  */
export function buildPMT(leaves: string[], filteredHash: string): { totalTX: number, hashes: string[], flags: number, hex: string }

/**
 *
 * @param network: testnet or mainnet
 * @param hash: block hash in hex format
 */
export function fetchBlockTxIds(network: string, hash: string): Promise<string[]>
