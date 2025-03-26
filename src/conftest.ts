/**
 * This file implements all the actions related to installing and caching conftest
 */

import * as tc from '@actions/tool-cache'
import * as os from 'node:os'
import { mapOS, mapArch } from './utils.js'

export async function download(version: string): Promise<string> {
  const pathToCachedCli = await tc.find('conftest', version)
  if (pathToCachedCli !== '') {
    return pathToCachedCli
  }

  const osArch = mapArch(os.arch())
  const plat = mapOS(os.platform())
  const osPlatform = String(plat[0]).toUpperCase() + String(plat).slice(1)

  const downloadUrl = `https://github.com/open-policy-agent/conftest/releases/download/v${version}/conftest_${version}_${osPlatform}_${osArch}.tar.gz`
  const pathToCliTar: string = await tc.downloadTool(downloadUrl)
  const pathToCli: string = await tc.extractTar(pathToCliTar)

  if (pathToCli === '' || pathToCliTar === '') {
    throw new Error(`Unable to download conftest from ${downloadUrl}`)
  }

  return await tc.cacheDir(pathToCli, 'conftest', version)
}
