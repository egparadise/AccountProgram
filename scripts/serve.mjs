import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const host = '127.0.0.1'
const port = Number(process.argv[2] || process.env.ACCOUNT_PROGRAM_PORT || 4173)
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}

if (!existsSync(join(root, 'index.html'))) {
  console.error('dist/index.html이 없습니다. npm run build를 먼저 실행하세요.')
  process.exit(1)
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', `http://${host}:${port}`).pathname)
  const relative = normalize(pathname).replace(/^[/\\]+/, '')
  let file = resolve(root, relative)
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html')
  response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Cache-Control', file.endsWith('index.html') || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=31536000, immutable')
  createReadStream(file).on('error', () => {
    response.statusCode = 500
    response.end('Internal Server Error')
  }).pipe(response)
}).listen(port, host, () => console.log(`정산ON: http://${host}:${port}`))
