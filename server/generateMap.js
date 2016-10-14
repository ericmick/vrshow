const fs = require('fs');
const PNG = require('pngjs').PNG;
const FastSimplexNoise = require('fast-simplex-noise');
const seedrandom = require('seedrandom');
const LRU = require('lru');

const cache = [new LRU(5), new LRU(5)];

const WIDTH = 512;
const HEIGHT = 512;

const data = fs.readFileSync('./server/terrain.png');
const colorLookup = PNG.sync.read(data);

function getColorPixel(displacementBytes, moistureBytes) {
    let x = Math.floor((colorLookup.width-1) * moistureBytes/255);
    let y = Math.floor((colorLookup.height-1) * (255 - displacementBytes)/255);
    return (colorLookup.width * y + x) << 2;
}

module.exports = function(seedValue, isDisplacement) {
    const cached = cache[isDisplacement ? 0 : 1].get(seedValue);
    if(cached) {
        return cached;
    }

    const noiseGen = new FastSimplexNoise({
        random: seedrandom(seedValue),
        frequency: .01,
        max: 255,
        min: 0,
        octaves: 3
    });

    const noiseGen2 = new FastSimplexNoise({
        random: seedrandom(seedValue),
        frequency: 0.01,
        max: 255,
        min: 0,
        octaves: 3
    });

    const img = new PNG({
        colorType: 6,
        width: WIDTH,
        height: HEIGHT
    });

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            let idx = (img.width * y + x) << 2;

            let displacement = noiseGen.in2D(x, y);

            // RGBA
            if(isDisplacement) {
                img.data[idx] = displacement;
                img.data[idx+1] = displacement;
                img.data[idx+2] = displacement;
                img.data[idx+3] = 255;
            } else {
                let moisture = noiseGen2.in2D(x, y);
                let lookupPixel = getColorPixel(displacement, moisture);
                img.data[idx] = colorLookup.data[lookupPixel];
                img.data[idx+1] = colorLookup.data[lookupPixel+1];
                img.data[idx+2] = colorLookup.data[lookupPixel+2];
                img.data[idx+3] = 255;
            }
        }
    }

    const buffer = PNG.sync.write(img);
    cache[isDisplacement ? 0 : 1].set(seedValue, buffer);
    return buffer;
};