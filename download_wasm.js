import fs from 'fs';
import https from 'https';
import path from 'path';

const urls = [
  'https://unpkg.com/openscad-wasm@0.0.4/openscad.wasm',
  // Fallback?
];

const dest = path.join(process.cwd(), 'public', 'wasm', 'openscad.wasm');

const download = (url) => {
  return new Promise((resolve, reject) => {
    console.log(`Trying ${url}...`);
    const file = fs.createWriteStream(dest);

    // Simple GET, might need to handle 302 manually if not natively supported in node version?
    // Node https.get usually follows redirects? No, it doesn't by default.
    // Let's assume unpkg redirects.

    const request = https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          reject(`Status ${response.statusCode}`);
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Download complete!');
          resolve(true);
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err.message);
      });
  });
};

download(urls[0]).catch((e) => console.error(e));
