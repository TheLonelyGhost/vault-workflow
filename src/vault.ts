import * as httpm from '@actions/http-client'
import * as core from '@actions/core'
import { retryAsyncFunction } from './utils.js'

const retries = 5
const retriesDelay = 3000

interface AuthResult {
  client_token: string
  accessor: string
  policies: string[]
  lease_duration: number
  renewable: boolean
}

interface JwtLoginResponse {
  auth?: AuthResult
  errors?: string[]
}

export interface ClientOpts {
  vaultAddr: string
  vaultToken: string
}

interface LoginOpts {
  vaultAddr: string
  vaultAuthPath: string
  vaultAuthRole: string
}

export async function login(
  vaultAddr: string,
  vaultAuthPath: string,
  vaultAuthRole: string,
): Promise<string> {
  const jwt: string =
    (await retryAsyncFunction<string>(
      retries,
      retriesDelay,
      core.getIDToken,
      'hashicorp-vault',
    )) ?? ''
  if (jwt === '')
    throw new Error('Unable to retrieve GitHub Actions workload identity (JWT)')
  const http: httpm.HttpClient = new httpm.HttpClient(
    'GitHub Actions: TheLonelyGhost/vault-workflow',
  )

  const resp = await http.postJson<JwtLoginResponse>(
    `${vaultAddr}/v1/${vaultAuthPath}/login`,
    { role: vaultAuthRole, jwt: jwt },
  )

  const vaultToken: string = resp.result?.auth?.client_token ?? ''
  const errors: string[] = resp.result?.errors ?? []

  if (vaultToken !== '') {
    errors.forEach((err) => core.warning(err))
    return vaultToken
  }

  throw new Error(
    [
      `Unable to authenticate to ${vaultAuthRole} as ${vaultAuthRole} using workload identity.`,
    ]
      .concat(errors)
      .join('\n\n'),
  )
}

export async function revokeToken(
  vaultAddr: string,
  vaultToken: string,
): Promise<void> {
  const http: httpm.HttpClient = new httpm.HttpClient(
    'GitHub Actions: TheLonelyGhost/vault-workflow',
  )

  await http
    .postJson(
      `${vaultAddr}/v1/auth/token/revoke-self`,
      {},
      {
        'X-Vault-Token': vaultToken,
      },
    )
    .catch((clientErr) => {
      const body = clientErr.result ?? { errors: [] }
      const errors = body.errors ?? []

      throw Error(
        [
          `Unsure if Vault token was actually revoked. Please verify directly or wait for it to expire`,
        ]
          .concat(errors)
          .join('\n\n'),
      )
    })
}
