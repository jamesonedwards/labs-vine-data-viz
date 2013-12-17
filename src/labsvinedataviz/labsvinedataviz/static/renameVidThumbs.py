
import os
path = 'vid/thumbs/'
files = os.listdir(path)
print files[0]
index = 1
for filename in files:
    os.rename(path + filename, path + 'video' + str(index) + '.jpg')
    index += 1