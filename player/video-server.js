const express = require('express')

const child_process = require('child_process')

const app = express()

module.exports = function() {
  app.use(express.static(__dirname + '/public'))

  app.listen(9999, () => {
    console.log('Video stream open on port 9999')
  })

  const relay = child_process.fork(__dirname + '/websocket-relay.js', ['falloutbotinput 9997 9998'], {
    detached: false,
    stdio: 'inherit'
  })

  return {server: app, relay: relay}
}