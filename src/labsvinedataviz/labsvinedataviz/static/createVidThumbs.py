
ffmpeg -i test.avi -vcodec png -ss 10 -vframes 1 -an -f rawvideo test.png

import os, sys
from PIL import Image
path = 'vid/thumbs/'

a, b, c = os.popen3("c:/Apps/ffmpeg/bin/ffmpeg -i " + path + 'video1.mp4')
out = c.read()
dp = out.index("Duration: ")
duration = out[dp+10:dp+out[dp:].index(",")]
hh, mm, ss = map(float, duration.split(":"))
total = (hh*60 + mm)*60 + ss
for i in xrange(9):
    t = (i + 1) * total / 10
    os.system("ffmpeg -i test.avi -ss %0.3fs frame%i.png" % (t, i))