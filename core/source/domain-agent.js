import { uuid, writeFile, randomBytes } from './utils.js'
import coreState from './core-state.js'
import configuration from './configuration.js'
import { ensureDomainConfigured } from './side-effects/configure.js'
import saveSession from './authenticate/save-session.js'
import handleConnection from './handle-connection.js'

const DomainAgents = {}
const connections = {}

async function createValidSession(domain, user) {
  const sid = randomBytes(32, 'hex')
  await ensureDomainConfigured(domain)
  await saveSession(domain, uuid(), sid, user, 'core', {
    user: domain,
    provider_id: domain,
    provider: 'core',
    info: { name: `${domain} Agent`, picture: null }
  })
  return sid
}

function createConnection(worker, id) {
  let queue = []

  const postMessage = m => worker.postMessage(m ? { ...m, connection: id} : m)

  return {
    async send(message) {
      // TODO: consider more reliable/explicit recognintion of auth response method
      if (!message) postMessage() // heartbeat
      else if (message.server) {
        postMessage(message)
        while (queue.length) postMessage(queue.shift())
        queue = null
      }
      else if (queue) queue.push(message)
      else postMessage(message)
    },
    close() {
      console.warn('WORKER CLOSED THROUGH CONNECTION!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
      worker.terminate()
    }
  }
}

function prettyPrintErrorEvent(error) {
  return `${error.message}
line: ${error.lineno}, column: ${error.colno}
`
}

export default function domainAgent(domain, refresh=false) {
  let mainConnection = null

  if (DomainAgents[domain]) {
    if (!refresh) return DomainAgents[domain]

    DomainAgents[domain]
      .then(agent => {
        agent.closed = true
        agent.onclose?.()
        agent.close()
      })
  }

  DomainAgents[domain] = new Promise(async (resolve, reject) => {
    const config = await configuration(domain)

    if (config.agent) {
      //  Initialize new session to make core logs
      const agentSessions = await coreState(domain, 'sessions', domain)
      const coreSessionId = uuid()
      agentSessions[coreSessionId] = { log: 'Initialized new agent' }
      const coreSession = agentSessions[coreSessionId]

      const filename = `/${uuid()}.js`
      await writeFile(filename, config.agent)
      const workerUrl = new URL(filename, import.meta.url).href

      const worker = new Worker(workerUrl, {
        type: "module",
        deno: {
          permissions: {
            env: ['AGENT_TOKEN'],
            hrtime: false,
            net: false,
            ffi: false,
            read: false,
            run: false,
            write: false,
          },
        }
      })

      worker.onerror = event => {
        console.log('DOMAIN AGENT ERROR', event)

        coreSession.log = prettyPrintErrorEvent(event)
        reject(event)
        //  Stop unhandled child error event from closing the core server
        event.preventDefault()

        //  remove domain agent from rotation so it will be reinitialized on next ask
        //  TODO: consider what to do with connections using errored domain agent
        delete DomainAgents[domain]

        if (mainConnection) {
          mainConnection.closed = true
          mainConnection.onclose?.()
          mainConnection.close()
        }
      }

      worker.onmessage = async ({ data }) => {
        if (!connections[data.connection]) {
          connections[data.connection] = createConnection(worker, data.connection)
          if (data.domain === null) {
            mainConnection = connections[data.connection]
            resolve(mainConnection)
          }
          const targetDomain = data.domain || domain
          const sid = await createValidSession(targetDomain, domain)
          handleConnection(connections[data.connection], targetDomain, sid)
        }
        connections[data.connection].onmessage(data)
      }
    }
    else {
      delete DomainAgents[domain]
      resolve()
    }
  })

  return DomainAgents[domain]
}
