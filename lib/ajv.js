import { importIfInstalled, require } from "./util.js"

const Ajv = await importIfInstalled("ajv")
const addFormats = await importIfInstalled("ajv-formats")

// export initialized ajv, if available
export default (() => { 
  if (Ajv && addFormats) {
    const ajv = new Ajv({strictTypes: false})
    addFormats(ajv)
    ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"))
    return ajv
  }
})()
