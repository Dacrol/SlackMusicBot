const express = require('express')

const child_process = require('child_process')

const app = express()

module.exports = function() {
  app.use(express.static(__dirname + '/public'))

  app.listen(9999, () => {
    console.log('Video stream open on port 9999')
  })

  const relay = child_process.fork(__dirname + '/websocket-relay.js', [
    'falloutbotinput', 
    '9997',
    '9998'], {
    detached: false,
    stdio: 'inherit',
    execArgv: ['--inspect=9230']
  })

/* 


  const ffmpeg = require('fluent-ffmpeg')
  const ytdl = require('ytdl-core')
  const stream = ytdl('https://www.youtube.com/watch?v=7Gr63DiEUxw', {
    highWaterMark: 2 ** 25,
    // quality: 'highest',
    // @ts-ignore
    // filter: 'audioandvideo'
  })

  setTimeout(() => {
    console.log("!")
    const audio = ffmpeg(stream).format('mpegts').inputOptions(['-re']).outputOptions(['-codec:v mpeg1video', '-s 1920x1080', '-b:v 7500k', '-bf 0', '-codec:a mp2', '-q 1', '-muxdelay 0.001'
    ])
    .output('http://localhost:9997/falloutbotinput')
    .run()
  }, 2000); 
*/

  return {server: app, relay: relay}
}

/* 
Send stream examples:

ffmpeg -re -i dancemacabre.webm -f mpegts -codec:v mpeg1video -s 1920x1080 -b:v 7500k -bf 0 -codec:a mp2 -q 1 -muxdelay 0.001 http://localhost:9997/falloutbotinput

ffmpeg -re -i dancemacabre.webm -f mpegts -codec:v mpeg1video -s 1920x1080 -b:v 6000k -bf 0 -codec:a mp2 -b:a 128k -muxdelay 0.001 http://localhost:9997/falloutbotinput
*/