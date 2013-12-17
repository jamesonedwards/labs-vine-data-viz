# Create your views here.
# from django.http import HttpResponse
from labsvinedataviz import settings
from util import *
from bson import json_util  # , MAX_INT32
import json
from django.core.cache import cache
import vinelabs
from django.template.context import RequestContext
from django.shortcuts import render_to_response
from labsvinedataviz.mongomodels import *
import uuid
from django.views.decorators.csrf import csrf_exempt
import logging
from oauth2client import client
from apiclient.discovery import build

''''''''' ROUTES '''''''''
def index(request):
    return render_to_response('labsvinedataviz/index.html', __get_context_vars(request), context_instance=RequestContext(request))

def terms(request):
    return render_to_response('labsvinedataviz/terms_and_conditions.html', __get_context_vars(request), context_instance=RequestContext(request))

def intro(request):
    return render_to_response('labsvinedataviz/intro.html', __get_context_vars(request), context_instance=RequestContext(request))

def unsupported(request):
    return render_to_response('labsvinedataviz/unsupported.html', __get_context_vars(request), context_instance=RequestContext(request))

def curvedtree(request):
    return render_to_response('labsvinedataviz/curvedtree.html', __get_context_vars(request), context_instance=RequestContext(request))

def wall(request):
    return render_to_response('labsvinedataviz/wall.html', __get_context_vars(request), context_instance=RequestContext(request))

def tree(request):
    return render_to_response('labsvinedataviz/tree.html', __get_context_vars(request), context_instance=RequestContext(request))

def rain(request):
    return render_to_response('labsvinedataviz/rain.html', __get_context_vars(request), context_instance=RequestContext(request))

def sphere(request):
    return render_to_response('labsvinedataviz/sphere.html', __get_context_vars(request), context_instance=RequestContext(request))

def voice(request):
    return render_to_response('labsvinedataviz/voice.html', __get_context_vars(request), context_instance=RequestContext(request))

def vinelibs(request):
    return render_to_response('labsvinedataviz/vinelibs.html', __get_context_vars(request), context_instance=RequestContext(request))

def ngsphere(request):
    return render_to_response('labsvinedataviz/ngsphere.html', __get_context_vars(request), context_instance=RequestContext(request))

def __get_context_vars(request):
    '''
    Build a list of key-value pairs to pass to the UI templates.
    '''
    return {
            # Root URL
            'root_url' : 'http://' + request.META['HTTP_HOST'] + '/',
            'share_title' : 'Vine Explorer, by LABSmb',
            'share_description' : 'The Vine Explorer is a project by the team at LABSmb to develop new and intriguing ways to explore Vine content.',
            'share_source' : 'mcgarrybowen LABS',
            'twitter_text' : 'Check out Vine Explorer for new ways to explore Vine content from the team @labsmb.'
            # Add more here as necessary...
            };

''''''''' API '''''''''
@csrf_exempt
def save_vine_sentence(request):
    callback = None
    response = None
    try:
        if request.method != 'POST':
            raise Exception('This service requires POST requests.')
        uniqueId = str(uuid.uuid4())
        nodes = json.loads(request.POST['results'])
        vineSentence = Vine_sentence(
                                     sentence_key=uniqueId,
                                     sentence_words=' '.join(nodes.keys()),
                                     sentence_timestamp=datetime.datetime.now(),
                                     sentence_nodes=nodes
                                     )
        # Save new Vine sentence.
        vineSentence.save()
        # Create short URL and return to client.
        shortUrl = __get_shortUrl(request, uniqueId)
        # Return success message.
        response = json.dumps({'url': shortUrl})
    except Exception as ex:
        # Respond with error.
        response = ApiResponse.from_exception(ex).to_json()
    return HttpHelper.return_http_response(response, callback)

def get_saved_vine_sentence(request, uniqueId=None):
    callback = None
    response = None
    try:
        # FIXME: Make sure order of words is preserved (specifically relating to non-search terms like "a").
        if uniqueId == None or len(uniqueId) == 0:
            raise Exception('UniqueId parameter is required!')
        callback = HttpHelper.get_callback_param(request)
        vineSentence = Vine_sentence.objects.get(sentence_key=uniqueId)
        # Return data.
        response = json.dumps({'results': vineSentence.to_dict()}, default=json_util.default) 
    except Exception as ex:
        # Respond with error.
        response = ApiResponse.from_exception(ex).to_json()
    return HttpHelper.return_http_response(response, callback)

def get_post(request):
    callback = None
    response = None
    try:
        # PostId is required.
        postId = None
        if 'postId' in request.GET and len(request.GET['postId']) > 0:
            postId = request.GET['postId']
        else:
            raise Exception('UserId is required!')
        callback = HttpHelper.get_callback_param(request)
        # First check the cache for API results.
        cacheKey = search_by_user.__name__ + '_' + unicode(postId)
        response = cache.get(cacheKey)
        if response == None:
            # The Vine API
            v = vinelabs.VineLabs()
            v.login(settings.VINE_USER, settings.VINE_PASSWORD)
            results = v.get_post(post_id_=postId)
            # Return the file list as JSON.
            response = {
                        'results': results
                        }
            # Now cache response.
            cache.set(cacheKey, response, settings.CACHE_DURATION)
        response = json.dumps(response, default=json_util.default)
    except Exception as ex:
        # Respond with error as JSON.
        response = ApiResponse.from_exception(ex).to_json()
    return HttpHelper.return_http_response(response, callback)

def search_by_tag(request):
    callback = None
    response = None
    try:
        # Hashtag is required.
        tag = None
        if 'tag' in request.GET and len(request.GET['tag']) > 0:
            tag = __sanitize_input(request.GET['tag'])
        else:
            raise Exception('Tag is required!')
        # Paging.
        (pageNo, pageSize) = HttpHelper.get_page_params(request)
        callback = HttpHelper.get_callback_param(request)
        # First check the cache for API results.
        cacheKey = search_by_tag.__name__ + '_' + tag + '_' + unicode(pageNo) + '_' + unicode(pageSize) 
        response = cache.get(cacheKey)
        if response == None:
            # The Vine API
            v = vinelabs.VineLabs()
            v.login(settings.VINE_USER, settings.VINE_PASSWORD)
            results = v.tag(tag_=tag, page=pageNo, size=pageSize)
            # Filter out private videos and optionally check for explicit content.
            # results['records'][:] = [record for record in results['records'] if (settings.FILTER_EXPLICIT_CONTENT == False or not __is_node_explicit(record)) and not __is_node_private(record)]
            results['records'][:] = __apply_results_filter(results)
            '''
            if settings.FILTER_EXPLICIT_CONTENT == True:
                # Source: http://stackoverflow.com/questions/1207406/remove-items-from-a-list-while-iterating-in-python/1208792#1208792
                results['records'][:] = [record for record in results['records'] if not __is_node_explicit(record)]
            '''
            # Return the file list as JSON.
            response = {
                        'results': results
                        }
            # Now cache response.
            cache.set(cacheKey, response, settings.CACHE_DURATION)
        response = json.dumps(response, default=json_util.default)
    except Exception as ex:
        # Respond with error as JSON.
        response = ApiResponse.from_exception(ex).to_json()
    return HttpHelper.return_http_response(response, callback)

def get_popular(request):
    callback = None
    response = None
    try:
        # Paging.
        (pageNo, pageSize) = HttpHelper.get_page_params(request)
        callback = HttpHelper.get_callback_param(request)
        # First check the cache for API results.
        cacheKey = search_by_tag.__name__ + '_popular_' + unicode(pageNo) + '_' + unicode(pageSize) 
        response = cache.get(cacheKey)
        if response == None:
            # The Vine API
            v = vinelabs.VineLabs()
            v.login(settings.VINE_USER, settings.VINE_PASSWORD)
            results = v.popular(page=pageNo, size=pageSize)
            # Filter out private videos and optionally check for explicit content.
            results['records'][:] = __apply_results_filter(results)
            '''
            if settings.FILTER_EXPLICIT_CONTENT == True:
                # Source: http://stackoverflow.com/questions/1207406/remove-items-from-a-list-while-iterating-in-python/1208792#1208792
                results['records'][:] = [record for record in results['records'] if not __is_node_explicit(record)]
            '''
            # Return the file list as JSON.
            response = {
                        'results': results
                        }
            # Now cache response.
            cache.set(cacheKey, response, settings.CACHE_DURATION)
        response = json.dumps(response, default=json_util.default)
    except Exception as ex:
        # Respond with error as JSON.
        response = ApiResponse.from_exception(ex).to_json()
    return HttpHelper.return_http_response(response, callback)

def search_by_user(request):
    callback = None
    response = None
    try:
        # UserId is required.
        userId = None
        if 'userId' in request.GET and len(request.GET['userId']) > 0:
            userId = request.GET['userId']
        else:
            raise Exception('UserId is required!')
        # Paging.
        (pageNo, pageSize) = HttpHelper.get_page_params(request)
        callback = HttpHelper.get_callback_param(request)
        # First check the cache for API results.
        cacheKey = search_by_user.__name__ + '_' + unicode(userId) + '_' + unicode(pageNo) + '_' + unicode(pageSize)
        response = cache.get(cacheKey)
        if response == None:
            # The Vine API
            v = vinelabs.VineLabs()
            v.login(settings.VINE_USER, settings.VINE_PASSWORD)
            results = v.user_timeline(user_id_=userId, page=pageNo, size=pageSize)
            # Return the file list as JSON.
            response = {
                        'results': results
                        }
            # Now cache response.
            cache.set(cacheKey, response, settings.CACHE_DURATION)
        response = json.dumps(response, default=json_util.default)
    except Exception as ex:
        # Respond with error as JSON.
        response = ApiResponse.from_exception(ex).to_json()
    return HttpHelper.return_http_response(response, callback)

''''''''' UTIL '''''''''
def __apply_results_filter(results):
    '''
    Filter out private videos and optionally check for explicit content.
    '''
    return [record for record in results['records'] if (settings.FILTER_EXPLICIT_CONTENT == False or not __is_node_explicit(record)) and not __is_node_private(record)]
    
def __is_node_explicit(node):
    '''
    Check the explicitContent flag in the API response. Note: this is not reliable.
    '''
    # TODO: Should I make this default to explicit to be safer?
    isExplicit = False
    try:
        if ('explicitContent' in node and int(node['explicitContent']) > 0):
            isExplicit = True
    except Exception as ex:
        logging.warning('Something unexpected happened when checking for explicit content: ' + ExceptionHelper.parse_exception(ex))
    return isExplicit

def __is_node_private(node):
    '''
    Check the private flag in the API response.
    '''
    isPrivate = False
    try:
        if ('private' in node and int(node['private']) > 0):
            isPrivate = True
    except Exception as ex:
        logging.warning('Something unexpected happened when checking for private content: ' + ExceptionHelper.parse_exception(ex))
    return isPrivate

def __get_shortUrl(request, uniqueId):
    '''
    Create short URL from goo.gl API, based on uniqueId.
    '''
    longUrl = 'http://' + request.META['HTTP_HOST'] + '/vinelibs/?uniqueId=' + str(uniqueId)
    service = build('urlshortener', 'v1', developerKey=settings.GOOGLE_API_KEY)
    try:
        url = service.url()
        # Create a shortened URL by inserting the URL into the url collection.
        body = {'longUrl': longUrl }
        resp = url.insert(body=body).execute()
        logging.info(resp)
        shortUrl = resp['id']
    except client.AccessTokenRefreshError:
        print ('The credentials have been revoked or expired, please re-run'
               'the application to re-authorize')
    return shortUrl

def __sanitize_input(inp):
    '''
    Sanitize the user input!
    '''
    return inp.replace('$', '').replace('#', '').lower()
