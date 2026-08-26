export const open = () => ({ db: { close() {} } })
export const status = () => JSON.parse(process.env.CT_STATUS)
export const send = (_handle, directive) => ({ directive })
