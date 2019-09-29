require('dotenv').config()
const os = require('os')
const ifaces = os.networkInterfaces()
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

player.on('playvideo', (event, title) => {
  if (event && event.channel && title) {
    const ip = getIP()
      rtm.sendMessage(
        `Now playing with video: ${title}${ip && (' (http://'+ ip +':9999)')}`,
        event.channel
      )
    }
  }
)

rtm.on('message', async event => {
  if (event.hidden) {
    return
  }
  console.log(event)
  if (event.subtype || !(event.channel.startsWith('C') || event.channel.startsWith('D'))) {
    console.log('Invalid channel')
    return
  }
  const message = event.text
  if (Player.isYoutube(message.split(' ')[0])) {
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
    return false
  }

  if (testCommand(command, ['stop', 'stfu'])) {
    player.stop()
    return true
  }

  if (testCommand(command, ['skip'])) {
    if (!player.isPlaying) {
      return true
    }
    rtm.sendMessage(
      `Track skipped`,
      event.channel
    )
    player.skip()
    return true 
  }


  if (testCommand(command, ['autoplay'])) {
    const autoplay = player.toggleAutoplay(args)
    rtm.sendMessage(
      `Autoplay ${autoplay ? 'enabled' : 'disabled'}`,
      event.channel
    )
    return true
  }

    if (
    testCommand(command, ['vol', 'volume']) 
  ) {
    if (args.trim() !== '' && isFinite(+args)) {
    player.volume = args
    rtm.sendMessage(
      `Volume set to ${player.volume}%`,
      event.channel
    )
  } else {
    rtm.sendMessage(
      `Volume is ${player.volume}%`,
      event.channel
    )
  }
    return true
  }

  /* Put commands that require args below */

  if (!args) {
    return false
  }

  if (
    testCommand(command, ['repeat']) &&
    (args.trim() !== '' && isFinite(+args))
  ) {
    player.repeat = args
    rtm.sendMessage(
      `Repeating ${player.isPlaying ? 'current' : 'next'} track ${args} times`,
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

function getIP() {
  try {
    const key = Object.keys(ifaces).find((key) => {
      return key.startsWith('Ethernet') || key.startsWith('wlp')
    })
    return ifaces[key][1].address
  } catch (error) {
    return ''
  }
}