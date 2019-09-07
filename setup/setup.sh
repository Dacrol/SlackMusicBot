#!/usr/bin/env bash

cp .asoundrc ~/.asoundrc
sudo apt-get install ffmpeg libasound2-dev mkchromecast mkchromecast-alsa -y
sudo bash -c 'echo "snd-aloop" >> /etc/modules'
