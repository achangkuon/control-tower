import { createServer } from "node:net"

export const acquireNodeLoopbackAtReservation = (_exactContext, requestedPort) => new Promise((resolve, reject) => {
  const server = createServer()
  const failed = (error) => { server.removeListener("listening", listening); reject(error) }
  const listening = () => {
    server.removeListener("error", failed)
    let closeResult
    resolve(() => {
      if (!closeResult) closeResult = new Promise((yes, no) => server.close((error) => error ? no(error) : yes()))
      return closeResult
    })
  }
  server.once("error", failed).once("listening", listening)
  server.listen({ host: "127.0.0.1", port: requestedPort, exclusive: true })
})
