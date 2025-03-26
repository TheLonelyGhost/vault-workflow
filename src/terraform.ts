/**
 * This file implements all the actions related to installing and caching Terraform CLI
 */

import { parse as hcl2Parse } from '@cdktf/hcl2json'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as releases from '@hashicorp/js-releases'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { mapOS, mapArch } from './utils.js'

export async function findVersionConstraint(basePath: string): Promise<string> {
  const files = fs
    .readdirSync(basePath)
    .filter((item) => item.match(/\.tf$/i) !== null)
    .map((filename) => fs.readFileSync(path.join(basePath, filename)))
    .join('\n\n')
    .trim()

  const code = await hcl2Parse('everything.tf', files)

  if (!Array.isArray(code.terraform)) {
    throw new Error(
      'No terraform blocks found which contain `required_version = ""`',
    )
  }

  const tf: Record<string, string> = code.terraform.find(
    (el) => 'required_version' in el && el.required_version,
  )
  if (tf !== null) {
    const rawConstraint: string = tf.required_version
    return convertToSemverConstraint(rawConstraint)
  }

  core.debug(
    'No `terraform { required_version = "" }` blocks from which to read version constraints.',
  )
  return '> 0.0.1'
}

function convertToSemverConstraint(terraformConstraint: string): string {
  const segments: string = terraformConstraint.replaceAll('~>', '^')
  return segments
    .split(',')
    .map((x) => x.trim())
    .join(' ')
}

export async function download(constraint: string): Promise<string> {
  const release = await releases.getRelease(
    'terraform',
    constraint,
    'GitHub Action: Setup Terraform',
  )

  const pathToCachedCli = await tc.find('terraform', release.version)
  if (pathToCachedCli !== '') {
    return pathToCachedCli
  }

  const osArch = mapArch(os.arch())
  const osPlatform = mapOS(os.platform())

  const build = await release.getBuild(osPlatform, osArch)

  const pathToCliZip: string = await tc.downloadTool(build.url)
  const pathToCli: string = await tc.extractZip(pathToCliZip)

  if (pathToCli === '' || pathToCliZip === '') {
    throw new Error(`Unable to download Terraform from ${build.url}`)
  }

  return await tc.cacheDir(pathToCli, 'terraform', release.version)
}
