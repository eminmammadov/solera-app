const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_BASE = 58;
const BASE58_CHAR_TO_VALUE = new Map(
  Array.from(BASE58_ALPHABET).map((char, index) => [char, index]),
);

export function encodeBase58(input: Uint8Array): string {
  if (input.length === 0) {
    return '';
  }

  const digits = [0];
  for (const byte of input) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      const value = digits[index] * 256 + carry;
      digits[index] = value % BASE58_BASE;
      carry = Math.floor(value / BASE58_BASE);
    }

    while (carry > 0) {
      digits.push(carry % BASE58_BASE);
      carry = Math.floor(carry / BASE58_BASE);
    }
  }

  let leadingZeroCount = 0;
  while (leadingZeroCount < input.length && input[leadingZeroCount] === 0) {
    leadingZeroCount += 1;
  }

  let encoded = '1'.repeat(leadingZeroCount);
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    encoded += BASE58_ALPHABET[digits[index]] ?? '';
  }

  return encoded;
}

export function decodeBase58(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) {
    return new Uint8Array();
  }

  const bytes = [0];
  for (const char of trimmed) {
    const value = BASE58_CHAR_TO_VALUE.get(char);
    if (value === undefined) {
      throw new Error('Invalid base58 character.');
    }

    let carry = value;
    for (let index = 0; index < bytes.length; index += 1) {
      const byteValue = bytes[index] * BASE58_BASE + carry;
      bytes[index] = byteValue & 0xff;
      carry = byteValue >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeroCount = 0;
  while (
    leadingZeroCount < trimmed.length &&
    trimmed[leadingZeroCount] === '1'
  ) {
    leadingZeroCount += 1;
  }

  const decoded = new Uint8Array(leadingZeroCount + bytes.length);
  for (let index = 0; index < leadingZeroCount; index += 1) {
    decoded[index] = 0;
  }
  for (let index = 0; index < bytes.length; index += 1) {
    decoded[decoded.length - 1 - index] = bytes[index]!;
  }

  return decoded;
}
