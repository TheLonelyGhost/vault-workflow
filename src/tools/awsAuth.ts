#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { createHash } from 'node:crypto'
import * as httpm from '@actions/http-client'

interface ifaceCreds {
  Version: number
  AccessKeyId: string
  SecretAccessKey: string
  SessionToken: string | null
  Expiration: string
}

class Creds {
  Version: number = 1
  AccessKeyId: string
  SecretAccessKey: string
  SessionToken: string | null = null
  Expiration: string

  constructor(
    ttl: number,
    access_key: string,
    secret_key: string,
    session_token?: string|null,
  ) {
    let exp = new Date()
    exp.setUTCSeconds(exp.getUTCSeconds() + ttl)

    this.Expiration = exp.toISOString()
    this.AccessKeyId = access_key
    this.SecretAccessKey = secret_key
    this.SessionToken = session_token ?? null
  }

  isExpired(): boolean {
    // because this is an ISO8601 string...
    const expiry = new Date(Date.parse(this.Expiration))
    const now = new Date()

    return Math.floor(expiry.getUTCSeconds() - now.getUTCSeconds()) <= 0
  }

  // Expires in the next 5 minutes, or is already expired
  expiresSoon(): boolean {
    // because this is an ISO8601 string...
    const expiry = new Date(Date.parse(this.Expiration))
    const now = new Date()

    return Math.floor(expiry.getUTCSeconds() - now.getUTCSeconds()) <= 300
  }

  isReliable(): boolean {
    return !this.expiresSoon()
  }

  toJSON(): string {
    return JSON.stringify({
      Version: 1,
      AccessKeyId: this.AccessKeyId,
      SecretAccessKey: this.SecretAccessKey,
      SessionToken: this.SessionToken,
      Expiration: this.Expiration,
    })
  }

  static fromObject(data: ifaceCreds): Creds {
    let out = new Creds(
      10,
      data.AccessKeyId,
      data.SecretAccessKey,
      data.SessionToken,
    )
    out.Expiration = data.Expiration
    return out
  }
}

interface CliArgs {
  sts?: boolean
  template?: string
  arn?: string
  mount?: string
}

async function readCache(key: string): Promise<Creds> {
  // TODO: Read from secure cache location on filesystem
  const data = Buffer.from('TODO', 'base64').toString('ascii')
  return Creds.fromObject(JSON.parse(data))
}

async function writeCache(key: string, payload: Creds): Promise<void> {
  // const data = Buffer.from(payload.toJSON()).toString('base64')
  // TODO: Write to secure cache location on filesystem
}

function getArgs(): CliArgs {
  const { values } = parseArgs({
    options: {
      template: {
        type: 'string',
        short: 't',
      },
      arn: {
        type: 'string',
        short: 'a',
      },
      sts: {
        type: 'boolean',
        short: 's',
        default: false,
      },
      mount: {
        type: 'string',
        short: 'm',
      },
    },
  })

  return values
}

async function generateAWSCreds(
  vaultAddr: string,
  vaultToken: string,
  mountPath: string,
  roleName: string,
  roleArn?: string,
  isSTS: boolean = true,
): Promise<Creds> {
  let extraArgs = {}
  if ((roleArn ?? '') !== '') {
    extraArgs = { role_arn: roleArn }
  }
  let resp

  // TODO: Change to use `@actions/http-client` instead of `fetch()`

  if (isSTS) {
    resp = await fetch(`${vaultAddr}/v1/${mountPath}/sts/${roleName}`, {
      method: 'POST',
      headers: {
        'X-Vault-Token': vaultToken,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...extraArgs,
      }),
    }).then((res) => res.json())
  } else {
    resp = await fetch(`${vaultAddr}/v1/${mountPath}/creds/${roleName}`, {
      method: 'GET',
      headers: {
        'X-Vault-Token': vaultToken,
        Accept: 'application/json',
      },
    }).then((res) => res.json())
  }
  // NOTE: TTL of `-1` means it does not expire. This shouldn't ever
  // happen with AWS secrets engine, but in case it does it is safer
  // to default to 1 hour ttl.
  const ttl = resp.data.ttl <= 0 ? 3600 : resp.data.ttl

  const creds = new Creds(
    ttl,
    resp.data.access_key,
    resp.data.secret_key,
    resp.data.session_token,
  )
  return creds
}

async function main() {
  const args = getArgs()
  const vaultAddr = process.env['VAULT_ADDR'] ?? ''
  const vaultToken = process.env['VAULT_TOKEN'] ?? ''
  const mountPath = args.mount ?? ''
  const roleName = args.template ?? ''
  if (vaultAddr === '')
    throw new TypeError('Missing VAULT_ADDR environment variable')
  if (vaultToken === '')
    throw new TypeError('Missing VAULT_TOKEN environment variable')
  if (mountPath === '')
    throw new TypeError(
      'Missing --mount flag containing the mount path of the AWS secrets engine in Vault',
    )
  if (roleName === '')
    throw new TypeError(
      'Missing --template flag containing the target role name on the AWS secrets engine in Vault',
    )

  const cacheKey = createHash('md5')
    .update(
      [
        vaultAddr,
        mountPath,
        roleName,
        args.sts ? '1' : '0',
        args.arn ?? 'no-arn',
      ].join('|'),
    )
    .digest('hex')

  const cachedCreds = await readCache(cacheKey)
  if (!cachedCreds.expiresSoon()) {
    process.stdout.write(cachedCreds.toJSON())
    return
  }

  const creds = await generateAWSCreds(
    vaultAddr,
    vaultToken,
    mountPath,
    roleName,
    args.arn ?? '',
    args.sts,
  )

  process.stdout.write(creds.toJSON())

  // NOTE: We explicitly do not want to `await` this one since caching is
  // a nice-to-have and shouldn't block from generating AWS creds in the
  // format we need. Any other cleanup can happen concurrently with
  // persisting cache.
  writeCache(cacheKey, creds)
}

await main()
