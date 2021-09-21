const crypto = require("crypto");

function aes128_encrypt(key, input) {
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    // return Buffer.concat([cipher.update(input), cipher.final()]).slice(0, 16);
    return cipher.update(input);
}

GenAppKey = Buffer.from([0x6E, 0x27, 0xC2, 0x9B, 0x07, 0xE0, 0x78, 0xAF, 0x9E, 0x3B, 0xEB, 0x9A, 0xD8, 0x3D, 0x81, 0xF5]);

// McRootKey = aes128_encrypt(GenAppKey, 0x00 | pad16)
McRootKey = aes128_encrypt(GenAppKey, Buffer.alloc(16));
console.log('McRootKey', McRootKey);

// McKEKey = aes128_encrypt(McRootKey, 0x00 | pad16)
McKEKey = aes128_encrypt(McRootKey, Buffer.alloc(16));

McKey_encrypted = Buffer.from([0xca, 0x12, 0x24, 0x3f, 0x9c, 0xa6, 0x89, 0x22, 0x3d, 0xb3, 0xed, 0x05, 0x40, 0x77, 0x68, 0x16]);
// McKey = aes128_encrypt(McKEKey, McKey_encrypted)
McKey = aes128_encrypt(McKEKey, McKey_encrypted);

McAddr = Buffer.from([0xFF, 0xFF, 0xFF, 0x01]);
// McAppSKey = aes128_encrypt(McKey, 0x01 | McAddr | pad16)
// McNetSKey = aes128_encrypt(McKey, 0x02 | McAddr | pad16)
McAppSKey = aes128_encrypt(McKey, Buffer.concat([Buffer.from([0x01]), McAddr, Buffer.alloc(16)]).slice(0, 16));
McNetSKey = aes128_encrypt(McKey, Buffer.concat([Buffer.from([0x02]), McAddr, Buffer.alloc(16)]).slice(0, 16));

console.log('McAppSKey', McAppSKey);
console.log('McNetSKey', McNetSKey);
