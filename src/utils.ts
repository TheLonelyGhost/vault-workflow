export async function delay(ms: number): Promise<void> {
  return await new Promise((resolve) => setTimeout(resolve, ms))
}

export function jitter(min: number, max: number): number {
  const sanitizedMax = Math.ceil(max)
  const sanitizedMin = Math.floor(min)

  return Math.floor(
    Math.random() * (sanitizedMax - sanitizedMin + 1) + sanitizedMin,
  )
}

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
export function mapArch(arch: string): string {
  const mappings: Record<string, string> = {
    x32: '386',
    x64: 'amd64',
  }
  if (arch in mappings) return mappings[arch]
  return arch
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
export function mapOS(os: string): string {
  const mappings: Record<string, string> = {
    win32: 'windows',
  }
  if (os in mappings) return mappings[os]
  return os
}

export async function retryAsyncFunction<T>(
  retries: number,
  delay: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func: (...args: any[]) => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Promise<T | undefined> {
  let attempt = 0
  if (delay < 0) throw new Error('Delay must be a positive integer')
  delay = Math.ceil(delay)

  while (attempt < retries) {
    try {
      const result = await func(...args)
      return result
    } catch (error) {
      attempt++
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }
}
