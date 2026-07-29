export class ContractError extends Error {
  constructor(code, message, diagnostics = []) {
    super(message)
    this.name = "ContractError"
    this.code = code
    this.diagnostics = Object.freeze(diagnostics.map((diagnostic) => Object.freeze({ ...diagnostic })))
    Object.freeze(this)
  }
}

export const failContract = (code, message, diagnostics) => {
  throw new ContractError(code, message, diagnostics)
}
