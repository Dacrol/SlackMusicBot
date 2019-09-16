require('dotenv').config()
const { RTMClient } = require('@slack/rtm-api')
const Player = require('../player/player')
const player = new Player()

const token = process.env.SLACK_BOT_TOKEN

const rtm = new RTMClient(token)

player.on('play', (event, title) => {
  if (event && event.channel && title) {
      rtm.sendMessage(
        `Now playing: ${title}`,
        event.channel
      )
    }
  }
)

rtm.on('message', async event => {
  console.log(event)
  if (event.subtype || !(event.channel.startsWith('C') || event.channel.startsWith('D'))) {
    console.log('Invalid channel')
    return
  }
  const message = event.text
  if (Player.isYoutube(message)) {
    try {
      player.queue(message, event)
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
  if (!command) {
    return
  }

  if (testCommand(command, ['stop', 'stfu'])) {
    player.stop()
  }

  if (testCommand(command, ['skip'])) {
    if (!player.isPlaying) {
      return
    }
    rtm.sendMessage(
      `Track skipped`,
      event.channel
    )
    player.skip()
  }


  if (testCommand(command, ['autoplay'])) {
    const autoplay = player.toggleAutoplay(args)
    rtm.sendMessage(
      `Autoplay ${autoplay ? 'enabled' : 'disabled'}`,
      event.channel
    )
  }
  
  /* Put commands that require args below */

  if (!args) {
    return
  }

  if (
    testCommand(command, ['vol', 'volume']) &&
    (args.trim() !== '' && isFinite(+args))
  ) {
    player.volume = args
    rtm.sendMessage(
      `Volume set`,
      event.channel
    )
  }
}

/**
 * @param {string} command
 * @param {Array} validCommands
 */
function testCommand(command, validCommands) {
  if (typeof validCommands === 'string') {
    validCommands = [validCommands]
  }
  return validCommands.some(valid => {
    return valid === command.toLowerCase()
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
