#!/usr/bin/env bash

cp .asoundrc ~/.asoundrc
sudo apt-get install ffmpeg libasound2-dev libasound2 alsa-utils alsa-oss mkchromecast mkchromecast-alsa mkchromecast-pulseaudio pulseaudio libglib2.0-dev -y
# sudo bash -c 'echo "snd-aloop" >> /etc/modules'
bash -c 'echo "set-default-sink Mkchromecast" >> /etc/pulse/default.pa'
pacmd set-default-sink Mkchromecast
cp startup /etc/init.d/startup

# mkchromecast --encoder-backend ffmpeg -c aac --control
# mkchromecast -c aac --control
# pacmd set-default-sink Mkchromecast