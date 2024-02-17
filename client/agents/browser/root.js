import { v1 as uuid } from 'uuid'
import { applyPatch } from 'fast-json-patch'
import { getToken, login, logout } from './auth.js'
import GenericAgent from '../generic/index.js'

const DEVELOPMENT_HOST = 'localhost:32001'
const REMOTE_HOST = localStorage.getItem('mode') === 'staging' ? 'api.staging.knowlearning.systems' : 'api.knowlearning.systems'

console.log('>>>>>>>>>>>>>>>>', REMOTE_HOST, localStorage.getItem('api'))

function isLocal() { return localStorage.getItem('api') === 'local' }

const API_HOST = isLocal() ? DEVELOPMENT_HOST : REMOTE_HOST

console.log('>>>>>>>>>>>>>>>> API_HOST', API_HOST)

export default options => {
  const { host, protocol } = window.location

  const Connection = function () {
    const ws = new WebSocket(`${protocol === 'https:' ? 'wss' : 'ws'}://${API_HOST}`)

    this.send = message => ws.send(JSON.stringify(message))
    this.close = () => ws.close()

    ws.onopen = () => this.onopen()
    ws.onmessage = ({ data }) => this.onmessage(data.length === 0 ? null : JSON.parse(data))
    ws.onerror = error => this.onerror && this.onerror(error)
    ws.onclose = error => this.onclose && this.onclose(error)

    return this
  }

  const agent = GenericAgent({
    token: options.getToken || getToken,
    Connection,
    uuid,
    fetch,
    applyPatch,
    login,
    logout,
    reboot: () => window.location.reload()
  })

  agent.local = () => {
    localStorage.setItem('api', 'local')
    location.reload()
  }
  agent.remote = (mode='production') => {
    localStorage.setItem('api', 'remote')
    localStorage.setItem('mode', mode)
    location.reload()
  }
  agent.close = () => {
    window.close()
  }

  return agent
}
