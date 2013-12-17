# from django.db import models
from mongoengine import *
from django.conf import settings
import datetime, time

# Create your models here.
 
# Connect to a db (no need to create this - it will be created automagically)
connect(settings.DATABASES['default']['NAME'], host=settings.DATABASES['default']['HOST'])

class Vine_sentence(Document):
    sentence_key = StringField(max_length=200, required=True)
    sentence_words = StringField(max_length=1000, required=True)
    sentence_timestamp = DateTimeField(required=True)
    sentence_nodes = DictField()

    def __unicode__(self):
        return self.sentence_words
    
    def to_dict(self):
        return {
                'sentence_key': self.sentence_key,
                'sentence_words': self.sentence_words,
                'sentence_timestamp': str(self.sentence_timestamp),
                'sentence_nodes': self.sentence_nodes
                }
