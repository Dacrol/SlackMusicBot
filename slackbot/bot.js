require('dotenv').config()
const { RTMClient } = require('@slack/rtm-api')
const Player = require('../player/player')
const player = new Player()

const token = process.env.SLACK_BOT_TOKEN

const rtm = new RTMClient(token)

rtm.on('message', async event => {
  if (event.subtype || !event.channel.startsWith('C')) {
    return
  }
  console.log(event)
  const message = event.text
  if (Player.isYoutube(message)) {
    try {
      player.queue(message)
      const reply = await rtm.sendMessage(
        `Song queued, <@${event.user}>`,
        event.channel
      )
    } catch (error) {
      console.warn(error)
    }
  } else {
    handleCommand(message, { event: event })
  }
})

function handleCommand(message, { event = {} } = {}) {
  let [command, args] = message.split(/\s(.+)/)
  if (!(command && args)) {
    return
  }

  if (
    testCommand(command, ['vol', 'volume']) &&
    (args.trim() !== '' && isFinite(+args))
  ) {
    player.volume = args
  }
}

/**
 * @param {string} command
 * @param {Array} validCommands
 */
function testCommand(command, validCommands) {
  return validCommands.some(valid => {
    return valid === command
  })
}

;(async () => {
  // Connect to Slack
  const { self, team } = await rtm.start()
  console.log('Connected!')
  setTimeout(() => {
    console.log(self, team)
  }, 5000)
})()
