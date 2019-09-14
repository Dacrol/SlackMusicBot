#!/usr/bin/env bash

# https://askubuntu.com/questions/18958/realtime-noise-removal-with-pulseaudio/608211#608211 :
# pacat -r -d alsa_input.pci-0000_00_14.2.analog-stereo --latency=1msec|sox -b 16 -e signed -c 2 -r 44100 -t raw - -b 16 -e signed -c 2 -r 44100 -t raw - noisered noise.prof 0.2|pacat -p -d alsa_output.2.analog-stereo --latency=1msec

# pacat -r -d alsa_input.usb-C-Media_Electronics_Inc._USB_Advanced_Audio_Device-00.analog-stereo --latency=1msec|sox -b 16 -e signed -c 2 -r 44100 -t raw - -b 16 -e signed -c 2 -r 44100 -t raw - noisered noise.prof 0.2|pacat -p -d alsa_output.usb-C-Media_Electronics_Inc._USB_Advanced_Audio_Device-00.analog-stereo --latency=1msec

pacat -r -d alsa_input.usb-C-Media_Electronics_Inc._USB_Advanced_Audio_Device-00.analog-stereo --latency=1msec|sox -b 16 -e signed -c 2 -r 44100 -t raw - -b 16 -e signed -c 2 -r 44100 -t raw - noisered /home/pi/noise.prof 0.2|pacat -p -d alsa_output.usb-C-Media_Electronics_Inc._USB_Advanced_Audio_Device-00.analog-stereo --latency=1msec

# OR: 
# pactl unload-module module-loopback