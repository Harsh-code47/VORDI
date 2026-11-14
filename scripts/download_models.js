// scripts/download_models.js
// Utility script to download open-source Sherpa-ONNX keyword spotting models for VORDI

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.resolve(__dirname, '../models');

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

console.log('=== VORDI Local Speech Model Setup ===');
console.log('Target Directory:', MODELS_DIR);
console.log('\nVORDI supports genuine offline keyword spotting with Sherpa-ONNX WebAssembly.');
console.log('To download pre-trained Sherpa-ONNX open-source KWS models (Apache 2.0):');
console.log('1. Visit: https://github.com/k2-fsa/sherpa-onnx/releases');
console.log('2. Download the Sherpa-ONNX WebAssembly pre-built runtime and model files:');
console.log('   - kws.onnx');
console.log('   - tokens.txt');
console.log('   - keywords.txt (configure "hey vordi")');
console.log('3. Place the downloaded files into:', MODELS_DIR);
console.log('\nWhen model files are placed in models/, Webpack bundles them into dist/models/ automatically.');
console.log('In the absence of local binary weights, VORDI runs in CONTINUOUS_ASR_FALLBACK or PUSH_TO_TALK_FALLBACK mode.\n');

