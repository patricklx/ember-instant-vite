import path from 'path';
import fs from 'fs';
import process from 'process';
import SparkMd5 from 'spark-md5';
const cache = path.join(__dirname, '.cache');

export function saveToCache(file, content) {
  fs.mkdirSync(cache, { recursive: true });
  if (typeof content === 'object') {
    content = JSON.stringify(content, null, 2)
  }
  fs.writeFileSync(`${cache}/${file}`, content);
}

export function hasCacheFor(file) {
  return fs.existsSync(path.join(cache, file));
}

export function loadFromCache(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cache, file)));
  } catch (e) {
    return fs.readFileSync(path.join(cache, file))
  }
}

export async function loadFromCacheAsync(file) {
  try {
    return JSON.parse(await fs.promises.readFile(path.join(cache, file)));
  } catch (e) {
    return (await fs.promises.readFile(path.join(cache, file))).toString();
  }
}


export function validateCache() {
  let key = null;
  if (hasCacheFor('package-lock-cache-key')) {
    key = loadFromCache('package-lock-cache-key')?.currentKey;
  }
  let currentKey = '';
  const dir = process.cwd();
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('-lock.json')) {
      const content = fs.readFileSync(path.join(dir, file)).toString();
      currentKey = SparkMd5.hash(content);
    }

    if (file.endsWith('-lock.yaml')) {
      const content = fs.readFileSync(path.join(dir, file)).toString();
      currentKey = SparkMd5.hash(content);
    }
  }
  if (currentKey !== key) {
    const cachedFiles = fs.existsSync(cache) ? fs.readdirSync(cache) : [];
    for (const cachedFile of cachedFiles) {
      fs.unlinkSync(path.join(cache, cachedFile));
    }
    saveToCache('package-lock-cache-key', { currentKey });
  }
}

validateCache();
