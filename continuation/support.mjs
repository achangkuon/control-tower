const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }

export const persistSupportResult = ({ output, main_store } = {}) => {
  if (typeof main_store?.persistSupportProposal !== "function") fail("CT_HOST_CAPABILITY_MISSING", "Main Support proposal store is unavailable")
  if (!output || typeof output !== "object") fail("CT_HOST_CAPABILITY_MISSING", "Isolated Support subagent returned no structured proposal")
  return main_store.persistSupportProposal({ actor: "MAIN", ...output })
}
