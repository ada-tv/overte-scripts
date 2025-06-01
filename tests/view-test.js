Script.test__ArrayBufferView(new Uint8ClampedArray([1, 2, 3, 4]));

const buffer = new ArrayBuffer(16);
const view = new DataView(buffer);

view.setUint32(0, 0xbeefbabe);
view.setUint32(4, 0xcafecace);

Script.test__ArrayBufferView(new Uint8ClampedArray(buffer, 4, 4));
