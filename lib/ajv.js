import { createRequire } from "node:module"
const require = createRequire(import.meta.url)

const { default: Ajv } = await import("ajv").catch(() => ({}))
const { default: addFormats } = await import("ajv-formats").catch(() => ({}))

// export initialized ajv, if available
export default (() => { 
  if (Ajv && addFormats) {
    const ajv = new Ajv({strictTypes: false})
    addFormats(ajv)
    ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"))
    return ajv
  }
})()
