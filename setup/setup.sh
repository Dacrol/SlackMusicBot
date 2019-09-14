#!/usr/bin/env bash

sudo apt-get install ffmpeg libasound2-dev libasound2 alsa-utils alsa-oss mkchromecast mkchromecast-alsa mkchromecast-pulseaudio pulseaudio libglib2.0-dev -y
sudo cp startup /etc/init.d/startup
sudo chmod 755 /etc/init.d/startup
sudo update-rc.d /etc/init.d/startup defaults

### PulseAudio ###
# sudo bash -c 'echo "set-default-sink Mkchromecast" >> /etc/pulse/default.pa'

### ALSA ###
# sudo bash -c "echo 'options snd_aloop id=Loopback index=-2' >> /etc/modprobe.d/alsa-base.conf"
# cp .asoundrc ~/.asoundrc
# sudo cp sound.conf /etc/modprobe.d/sound.conf

# mkchromecast --encoder-backend ffmpeg -c aac --control
# mkchromecast -c aac --control