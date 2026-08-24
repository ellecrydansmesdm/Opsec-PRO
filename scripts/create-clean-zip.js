const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Pure Node.js standard ZIP generator with forward slashes (Unix style)
function createZip(sourceDir, outPath) {
  const files = [];

  function readDir(dir, base) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = (base ? base + '/' : '') + entry.name;
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          readDir(fullPath, relPath);
        }
      } else {
        files.push({
          relPath: relPath.replace(/\\/g, '/'), // UNIX style forward slashes!
          data: fs.readFileSync(fullPath)
        });
      }
    }
  }

  readDir(sourceDir, '');

  // Build ZIP buffer manually
  const localHeaders = [];
  const centralDirs = [];
  let offset = 0;

  function getDosTime(d = new Date()) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }

  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
    }
    return (c ^ -1) >>> 0;
  }

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  const { time, date } = getDosTime();

  for (const file of files) {
    const filenameBuf = Buffer.from(file.relPath, 'utf8');
    const uncompressedSize = file.data.length;
    const crc = crc32(file.data);
    const compressedData = zlib.deflateRawSync(file.data);
    const compressedSize = compressedData.length;

    // Local file header (30 bytes + name)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6);  // flags
    localHeader.writeUInt16LE(8, 8);  // compression method (deflate)
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    filenameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory header (46 bytes + name)
    const cdHeader = Buffer.alloc(46 + filenameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // signature
    cdHeader.writeUInt16LE(20, 4); // version made by
    cdHeader.writeUInt16LE(20, 6); // version needed
    cdHeader.writeUInt16LE(0, 8);  // flags
    cdHeader.writeUInt16LE(8, 10); // compression method (deflate)
    cdHeader.writeUInt16LE(time, 12);
    cdHeader.writeUInt16LE(date, 14);
    cdHeader.writeUInt32LE(crc, 16);
    cdHeader.writeUInt32LE(compressedSize, 20);
    cdHeader.writeUInt32LE(uncompressedSize, 24);
    cdHeader.writeUInt16LE(filenameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30); // extra len
    cdHeader.writeUInt16LE(0, 32); // comment len
    cdHeader.writeUInt16LE(0, 34); // disk num
    cdHeader.writeUInt16LE(0, 36); // internal attrs
    cdHeader.writeUInt32LE(0, 38); // external attrs
    cdHeader.writeUInt32LE(offset, 42); // relative offset of local header
    filenameBuf.copy(cdHeader, 46);

    centralDirs.push(cdHeader);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirBuffer = Buffer.concat(centralDirs);
  const centralDirSize = centralDirBuffer.length;
  const centralDirOffset = offset;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk number with start of CD
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  const finalZip = Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
  fs.writeFileSync(outPath, finalZip);
  console.log(`✅ Clean Linux/UNIX compatible ZIP generated at: ${outPath} (${finalZip.length} bytes, ${files.length} files)`);
  
  // Write base64 for browser deploy
  fs.writeFileSync('fhub-zip-b64.txt', finalZip.toString('base64'));
}

createZip(path.join(__dirname, '..', 'fhub-bot'), path.join(__dirname, '..', 'fhub-core-bot.zip'));
