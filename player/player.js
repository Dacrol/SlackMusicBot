const lame = require('lame')
const Decoder = lame.Decoder
const Speaker = require('speaker')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')
const Volume = require('pcm-volume')

class Player {
  constructor() {
    this.queued = []
    this.isPlaying = false
    this.currentVolume = 1
    this.volumeTransform = null
  }

  set volume(vol) {
    if (vol > 100) {
      vol = 100
    }
    vol = vol / 100
    this.currentVolume = vol
    if (this.volumeTransform) {
      this.volumeTransform.setVolume(vol)
    }
  }

  play(url) {
    return new Promise(async (resolve, reject) => {
      if (!Player.isYoutube(url)) {
        reject(new Error('Not a valid YouTube ID/URL'))
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
        const speaker = new Speaker({
          channels: 2,
          bitDepth: 16,
          sampleRate: 48000
        })

        this.volumeTransform = new Volume(this.currentVolume)

        const playing = audio
          .pipe(
            // @ts-ignore
            new Decoder({
              channels: 2,
              bitDepth: 16,
              sampleRate: 48000,
              mode: lame.STEREO
            })
          )
          .pipe(this.volumeTransform)
          .pipe(speaker)
        playing.on('close', () => {
          console.log('Audio played successfully')
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  queue(url) {
    if (!Player.isYoutube(url)) {
      throw new Error('Not a valid YouTube ID/URL')
    }
    this.queued.push(url)
    if (!this.isPlaying) {
      this.playQueue()
    }
  }

  playNext() {
    return this.play(this.queued.pop())
  }

  async playQueue() {
    while (this.queued.length > 0) {
      this.isPlaying = true
      await this.playNext()
    }
    this.isPlaying = false
  }

  static isYoutube(string) {
    return ytdl.validateURL(string) || ytdl.validateID(string)
  }
}

module.exports = Player
if (process.argv[2]) {
  const player = new Player()
  player.play(process.argv[2]).then(() => {
    setTimeout(() => {
      process.exit(0)
    }, 1000)
  })
}
