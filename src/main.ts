import * as core from '@actions/core'
import * as terraform from './terraform.js'
import * as conftest from './conftest.js'
import * as path from 'node:path'
import * as vault from './vault.js'

async function installTerraform(): Promise<void> {
  const constraint = await terraform.findVersionConstraint(process.cwd())
  const pathToCLI = await terraform.download(constraint)
  core.addPath(pathToCLI)
}

async function installConftest(): Promise<void> {
  // const constraint = await conftest.findVersionConstraint(process.cwd())
  const constraint = '0.58.0'
  const pathToCLI = await conftest.download(constraint)
  core.addPath(pathToCLI)
}

async function vaultLogin(vaultAddr: string): Promise<string> {
  const vaultAuthPath = core.getInput('auth-mount', { required: false })
  const vaultAuthRole = core.getInput('auth-role', { required: true })

  const token = await vault.login(vaultAddr, vaultAuthPath, vaultAuthRole)
  core.setSecret(token)
  core.saveState('vaultToken', token)

  return token
}

async function vaultRevokeToken(vaultAddr: string): Promise<void> {
  const token = core.getState('vaultToken')

  await vault.revokeToken(vaultAddr, token)
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    await core.group('terraform init', async () => {
      // TODO: run `terraform init`
    })

    await core.group('terraform plan', async () => {
      // TODO: run `terraform plan -out=./tfplan`
    })

    await core.group('conftest test', async () => {
      // TODO: run `terraform show -json ./tfplan | conftest test --policy "$TFPLAN_POLICY_PATH" -`
    })
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

export async function setup(): Promise<void> {
  const vaultAddr = core.getInput('vault', { required: true })

  await Promise.all([
    installTerraform(),
    installConftest(),
    core.exportVariable(
      'TFPLAN_POLICY_PATH',
      path.resolve(path.join(__dirname, '..', 'policies', 'plan')),
    ),
    core.exportVariable(
      'TFCODE_POLICY_PATH',
      path.resolve(path.join(__dirname, '..', 'policies', 'tf-code')),
    ),
    vaultLogin(vaultAddr),
  ]).catch((error) => {
    if (error instanceof Error) core.setFailed(error.message)
  })
}

export async function cleanup(): Promise<void> {
  const vaultAddr = core.getInput('vault', { required: true })

  await Promise.all([
    vaultRevokeToken(vaultAddr).catch((error) => {
      if (error instanceof Error) core.warning(error.message)
    }),
  ]).catch((error) => {
    if (error instanceof Error) core.setFailed(error.message)
  })
}
