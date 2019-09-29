require('dotenv').config()
const os = require('os')
const ifaces = os.networkInterfaces()
const { RTMClient } = require('@slack/rtm-api')
const { WebClient } = require('@slack/web-api')
const { getInfo } = require('ytdl-getinfo')
const Player = require('../player/player')
const player = new Player()

const botToken = process.env.SLACK_BOT_TOKEN

const rtm = new RTMClient(botToken)
const webClient = new WebClient(botToken)

let searchLimit = 5

player.on('play', (event, title) => {
  if (event && event.channel && title) {
    rtm.sendMessage(`Now playing: ${title}`, event.channel)
  }
})

player.on('playvideo', (event, title) => {
  if (event && event.channel && title) {
    const ip = getIP()
    rtm.sendMessage(
      `Now playing with video: ${title}${ip && ' (http://' + ip + ':9999)'}`,
      event.channel
    )
  }
})

rtm.on('message', async event => {
  if (event.hidden) {
    return
  }
  console.log(event)
  if (
    event.subtype ||
    !(event.channel.startsWith('C') || event.channel.startsWith('D'))
  ) {
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
    const commandHandled = handleCommand(message, { event: event })
    if (!commandHandled) {
      searchAndQueue(message, event)
    }
  }
})


async function setQueueTimer(event, target, callback) {
  let reply = await rtm.sendMessage(
    `Queuing ${target.title} in 10 seconds`,
    event.channel
  )
  const timeoutFunction = () => {
    player.queue(target.id, event)
    webClient.chat.delete({channel: event.channel, ts: reply.ts})
    rtm.sendMessage(
      `Queued ${target.title}`,
      event.channel
    )
    callback()
  }
  let timeout = setTimeout(timeoutFunction, 10000);
  await webClient.reactions.add({name: 'x', channel: event.channel, timestamp: reply.ts})
  await webClient.reactions.add({name: 'ok_hand', channel: event.channel, timestamp: reply.ts})
  await webClient.reactions.add({name: 'fast_forward', channel: event.channel, timestamp: reply.ts})
  return { timeout, reply, timeoutFunction }
}

async function searchAndQueue(message, event) {
  const info = await getInfo(message, ['--default-search=ytsearch' + searchLimit, '-i'], true)
  try {
    let index = 0
    let target = info.items[index]
    let handleReaction = async _event => {
      if (_event.user == rtm.activeUserId) {
        return
      }
      if (_event.reaction === 'fast_forward') {
        clearTimeout(timeout)
        index++
        webClient.chat.delete({channel: event.channel, ts: reply.ts})
        if (index >= info.items.length) {
          cleanUp()
          return
        }
        target = info.items[index]
        const newVars = await setQueueTimer(event, target, cleanUp)
        timeout = newVars.timeout
        reply = newVars.reply
        timeoutFunction = newVars.timeoutFunction
        return
      }
      if (_event.reaction === 'x') {
        clearTimeout(timeout)
        webClient.chat.delete({channel: event.channel, ts: reply.ts})
        cleanUp()
        return
      }
      if (_event.reaction === 'ok_hand') {
        clearTimeout(timeout)
        timeoutFunction()
        return
      }
    }
    var cleanUp = () => {
      rtm.off('reaction_added', handleReaction)
      rtm.off('reaction_removed', handleReaction)
    }
    var { timeout, reply, timeoutFunction } = await setQueueTimer(event, target, cleanUp)
    rtm.on('reaction_added', handleReaction)
    rtm.on('reaction_removed', handleReaction)
  } catch (error) {
    console.warn(error)
  }
}

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
    rtm.sendMessage(`Track skipped`, event.channel)
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

  if (testCommand(command, ['vol', 'volume'])) {
    if (args && args.trim() !== '' && isFinite(+args)) {
      player.volume = args
      rtm.sendMessage(`Volume set to ${player.volume * 100}%`, event.channel)
    } else {
      rtm.sendMessage(`Volume is ${player.volume * 100}%`, event.channel)
    }
    return true
  }

  /* Put commands that require args below */

  if (!args) {
    return false
  }

  if (
    testCommand(command, ['set'])
  ) {
    const argParts = args.split(' ')
    if (!(argParts.length > 1)) {
      return true
    }
    if (argParts[0] === 'searchlimit' && isFinite(+argParts[1])) {
      searchLimit = +argParts[1]
      rtm.sendMessage(`Search limit set to ${searchLimit}`, event.channel)
    }
    return true
  }

  if (
    testCommand(command, ['get'])
  ) {
    if (args === 'searchlimit') {
      rtm.sendMessage(`Search limit is ${searchLimit}`, event.channel)
    }
    return true
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
    return true
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
    const key = Object.keys(ifaces).find(key => {
      return key.startsWith('Ethernet') || key.startsWith('wlp')
    })
    return ifaces[key][1].address
  } catch (error) {
    return ''
  }
}
