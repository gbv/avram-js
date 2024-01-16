import { createRequire } from "node:module"

export const require = createRequire(import.meta.url)
export const importIfInstalled = async module => {
  const { default: imported } = await import(module).catch(() => ({}))
  return imported
}
