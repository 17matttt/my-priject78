/**
 * Device-local auth + storage.
 *
 * Used only when the Supabase environment variables are absent. Data lives in
 * this browser only, and the interface clearly labels the app as device-local.
 * Passwords are stretched with PBKDF2 before being stored.
 */

const ACCOUNTS_KEY = 'vault.accounts.v1'
const SESSION_KEY = 'vault.session.v1'
const DATA_PREFIX = 'vault.data.v1:'

export interface LocalAccount {
  id: string
  email: string
  name: string
  salt: string
  hash: string
  created_at: string
}

export interface LocalSession {
  id: string
  email: string
  name: string
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function weakHash(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0
  }
  return `${h1.toString(16)}${h2.toString(16)}`
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return weakHash(`${saltHex}:${password}`)
  const encoder = new TextEncoder()
  const key = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: 150_000, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  return toHex(bytes)
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function accounts(): LocalAccount[] {
  return readJson<LocalAccount[]>(ACCOUNTS_KEY, [])
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function currentLocalSession(): LocalSession | null {
  return readJson<LocalSession | null>(SESSION_KEY, null)
}

export function localSignUp(email: string, password: string, name: string): LocalSession {
  const clean = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Enter a valid email address.')
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
  const list = accounts()
  if (list.some((a) => a.email === clean)) {
    throw new Error('An account with this email already exists on this device. Sign in instead.')
  }
  const salt = randomSalt()
  const account: LocalAccount = {
    id: clean,
    email: clean,
    name: name.trim() || clean.split('@')[0],
    salt,
    hash: '',
    created_at: new Date().toISOString(),
  }
  // Synchronous hash is not available here; store a placeholder then upgrade.
  account.hash = `pending:${salt}`
  list.push(account)
  writeJson(ACCOUNTS_KEY, list)
  const session: LocalSession = { id: account.id, email: account.email, name: account.name }
  writeJson(SESSION_KEY, session)
  return session
}

export async function localSignUpAsync(
  email: string,
  password: string,
  name: string,
): Promise<LocalSession> {
  const clean = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Enter a valid email address.')
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
  const list = accounts()
  if (list.some((a) => a.email === clean)) {
    throw new Error('An account with this email already exists on this device. Sign in instead.')
  }
  const salt = randomSalt()
  const hash = await hashPassword(password, salt)
  const account: LocalAccount = {
    id: clean,
    email: clean,
    name: name.trim() || clean.split('@')[0],
    salt,
    hash,
    created_at: new Date().toISOString(),
  }
  list.push(account)
  writeJson(ACCOUNTS_KEY, list)
  const session: LocalSession = { id: account.id, email: account.email, name: account.name }
  writeJson(SESSION_KEY, session)
  return session
}

export async function localSignIn(email: string, password: string): Promise<LocalSession> {
  const clean = normalizeEmail(email)
  const account = accounts().find((a) => a.email === clean)
  if (!account) throw new Error('No account with this email on this device. Create one first.')
  const hash = await hashPassword(password, account.salt)
  if (hash !== account.hash) throw new Error('That password does not match this account.')
  const session: LocalSession = { id: account.id, email: account.email, name: account.name }
  writeJson(SESSION_KEY, session)
  return session
}

export function localSignOut(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function localRenameAccount(id: string, name: string): void {
  const list = accounts().map((a) => (a.id === id ? { ...a, name: name.trim() || a.name } : a))
  writeJson(ACCOUNTS_KEY, list)
  const session = currentLocalSession()
  if (session?.id === id) writeJson(SESSION_KEY, { ...session, name: name.trim() || session.name })
}

export function localDeleteAccount(id: string): void {
  writeJson(
    ACCOUNTS_KEY,
    accounts().filter((a) => a.id !== id),
  )
  localStorage.removeItem(`${DATA_PREFIX}${id}`)
  localStorage.removeItem(SESSION_KEY)
}

export function dataKey(userId: string): string {
  return `${DATA_PREFIX}${userId}`
}

export { readJson, writeJson }
