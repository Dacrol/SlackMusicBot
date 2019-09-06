const decoder = require('lame').Decoder
const Speaker = require('speaker')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')

// @ts-ignore
const speaker = new Speaker({
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100
})

class Player {
  play(url) {
    return new Promise(async (resolve, reject) => {
      if (
        !(
          typeof url === 'string' &&
          ['https://www.youtube.com/', 'http://www.youtube.com/', 'youtube.com/'].some(validUrl => {
            return url.startsWith(validUrl)
          })
        )
      ) {
        return
      }
      try {
        const stream = ytdl(url, {
          highWaterMark: 2 ** 25,
          quality: 'highestaudio',
          filter: 'audioonly'
        })

        const audio = ffmpeg(stream).format('mp3')
        // @ts-ignore
        const playing = audio.pipe(decoder()).pipe(speaker)
        playing.on('close', () => {
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }
}

module.exports = Player

if (process.argv[2]) {
  const player= new Player()
  player.play(process.argv[2]).then(() => {
    console.log('Audio played successfully')
    setTimeout(() => {
      process.exit(0)
    }, 1000);
  })
}