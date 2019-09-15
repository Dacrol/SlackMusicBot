const lame = require('lame')
const Decoder = lame.Decoder
const Speaker = require('speaker')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')
const Volume = require('pcm-volume')
const { getInfo } = require('ytdl-getinfo')
const axios = require('axios').default

class Player {
  constructor() {
    this.queued = []
    this.isPlaying = false
    this.currentVolume = 1
    this.volumeTransform = null
    this.currentlyPlaying = null
    this.currentAudio = null
    this.currentStream = null
    this.autoplay = false
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
        let streamError = null
        const stream = ytdl(url, {
          highWaterMark: 2 ** 25,
          quality: 'highestaudio',
          filter: 'audioonly'
        })

        let info = {}

        stream.on('info', (_info, format) => {
          info = _info
        })

        this.currentStream = stream

        const audio = ffmpeg(stream).format('mp3')
        audio.on('error', (error) => {
          streamError = error
          reject(error)
        })
        this.currentAudio = audio
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
        this.currentlyPlaying = playing
        playing.on('close', () => {
          if (streamError) return
          console.log('Audio played successfully')
          resolve({url: url, info: info})
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
      this.playQueue().catch(error => {
        console.error(error)
      })
    }
  }

  skip() {
    this.currentAudio.kill('SIGKILL')
    this.currentlyPlaying.destroy()
    this.currentStream.destroy()
  }

  playNext() {
    const url = this.queued.pop()
    return this.play(url)
  }

  async autoPlayNextTrack(url) {
  }

  async getAutoplayTrack(info) {
    try {
      const endscreenUrl = 'https:' +  info.player_response.endscreen.endscreenUrlRenderer.url
      let {data: endscreenInfo} = await axios.get(endscreenUrl)
      if (endscreenInfo.startsWith(')]}')) {
        endscreenInfo = endscreenInfo.replace(/^\)\]\}/, '')
        endscreenInfo = JSON.parse(endscreenInfo)
      }
      const nextVideo = endscreenInfo.elements.find((element) => {
        if (element.endscreenElementRenderer.style.toLowerCase() === 'video') {
          return true
        }
      })
      let nextID = nextVideo.endscreenElementRenderer.endpoint.urlEndpoint.url
      if (nextID.startsWith('/watch?v=')) {
        nextID = nextID.replace('/watch?v=', '')
      }
      console.log(nextID, info.video_url)
      return nextID
    } catch (error) {
      console.trace('Error while looking up next video to autoplay')
      throw error
    }
  }

  async playQueue() {
    while (this.queued.length > 0) {
      this.isPlaying = true
      const playedTrack = await this.playNext().catch((error) => {
        console.trace('Error while playing next, or track was skipped', error)
      })
      if (this.queued.length === 1 && this.autoplay) {
        try {
          const nextTrack = await this.getAutoplayTrack(playedTrack.info)
          this.queue(nextTrack)
        } catch (error) {
          console.warn('Video had no next video to autoplay')
        }
      }
    }
    this.isPlaying = false
  }

  toggleAutoplay(value) {
    if (!value) {
      this.autoplay = !this.autoplay
    }
    else if (['1', 'on', 'enable', 'enabled'].some(str => value === str)) {
      this.autoplay = true
    }
    else if (['0', 'off', 'disable', 'disabled'].some(str => value === str)) {
      this.autoplay = false
    }
    return this.autoplay
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
