from django.conf.urls import patterns, include, url
from django.conf import settings
from labsvinedataviz import views

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('labsvinedataviz.views',
    url(r'^search_by_tag/$', 'search_by_tag', name='search_by_tag'),
    url(r'^search_by_user/$', 'search_by_user', name='search_by_user'),
    url(r'^get_post/$', 'get_post', name='get_post'),
    url(r'^get_popular/$', 'get_popular', name='get_popular'),
    url(r'^intro/$', 'intro', name='intro'),
    url(r'^rain/$', 'rain', name='rain'),
    url(r'^sphere/$', 'sphere', name='sphere'),
    url(r'^voice/$', 'voice', name='voice'),
    url(r'^tree/$', 'tree', name='tree'),
    url(r'^wall/$', 'wall', name='wall'),
    url(r'^curvedtree/$', 'curvedtree', name='curvedtree'),
    url(r'^vinelibs/$', 'vinelibs', name='vinelibs'),
    url(r'^save_vine_sentence/$', 'save_vine_sentence', name='save_vine_sentence'),
    url(r'^get_saved_vine_sentence/(?P<uniqueId>[-\w]+)/$', views.get_saved_vine_sentence, name='get_saved_vine_sentence'),
    url(r'^unsupported/$', 'unsupported', name='unsupported'),
    url(r'^ngsphere/$', 'ngsphere', name='ngsphere'),
    url(r'^terms/$', 'terms', name='terms'),
    url(r'^$', 'index', name='index'),
)

# urlpatterns += patterns('',
#                        url(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_URL, 'show_indexes': True}),
# )

if settings.DEBUG:
    # static files (images, css, javascript, etc.)
    urlpatterns += patterns('',
        (r'^media/(?P<path>.*)$', 'django.views.static.serve', {
        'document_root': settings.MEDIA_ROOT}))
