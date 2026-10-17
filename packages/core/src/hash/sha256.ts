// Synchronous, pure-JS SHA-256 (so Node and the browser agree without async WebCrypto).
// @noble/hashes is the only third-party hash dependency allowed in core (see ADR-037).
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/** Lowercase hex SHA-256 of the UTF-8 encoding of `text`. */
export function sha256Hex(text: string): string {
  return bytesToHex(sha256(utf8ToBytes(text)));
}
