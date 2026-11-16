import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'

const PORT = Number(process.env.PORT) || 3000
const HOST = '0.0.0.0'
const ROOT = resolve(process.cwd(), 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  res.end(body)
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' })
  }

  let pathname = '/'
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname)
  } catch {
    return send(res, 400, 'Bad Request')
  }

  if (pathname.length > 1) {
    // Tolerate trailing slashes so /healthz/ and /tasks/ resolve like /healthz and /tasks.
    pathname = pathname.replace(/\/+$/, '') || '/'
  }

  if (pathname === '/healthz') {
    return send(res, 200, 'ok', { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
  }

  // Dynamic health probe used to confirm the Node server (not a static fallback) is serving.
  if (pathname === '/api/health') {
    return send(
      res,
      200,
      JSON.stringify({ status: 'ok', service: 'vault', time: new Date().toISOString() }),
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    )
  }

  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(ROOT, safePath)

  // Prevent path traversal outside of dist.
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, 'Forbidden')
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html')
  }

  // SPA fallback for client-side routes.
  if (!existsSync(filePath)) {
    filePath = join(ROOT, 'index.html')
  }

  if (!existsSync(filePath)) {
    return send(res, 503, 'Application is building. Please retry in a moment.')
  }

  const ext = extname(filePath).toLowerCase()
  const immutable = filePath.includes(`${join(ROOT, 'assets')}`)
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': immutable
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, must-revalidate',
  }

  res.writeHead(200, headers)
  if (req.method === 'HEAD') return res.end()
  createReadStream(filePath)
    .on('error', () => {
      if (!res.headersSent) send(res, 500, 'Internal Server Error')
      else res.end()
    })
    .pipe(res)
})

server.listen(PORT, HOST, () => {
  console.log(`VAULT listening on http://${HOST}:${PORT}`)
})
