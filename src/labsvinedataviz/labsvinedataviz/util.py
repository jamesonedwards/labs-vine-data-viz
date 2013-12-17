from django.utils import simplejson
from django.http import HttpResponse

class ApiResponse(object):
    def __init__(self, success=None, message=None):
        self.success = success
        self.message = message
    success = None
    message = None
    def to_json(self):
        return simplejson.dumps({'success': self.success, 'message': self.message})
    @staticmethod
    def from_exception(ex=None):
        if ex is None:
            return ApiResponse(success=True)
        else:
            return ApiResponse(success=False, message=ExceptionHelper.parse_exception(ex))

class ExceptionHelper(object):
    @staticmethod
    def parse_exception(exception):
        if len(exception.message) == 0 and hasattr(exception, 'args') and len(exception.args) > 0:
            return str(exception.args)
        else:
            return exception.message

class HttpHelper(object):
    @staticmethod
    def return_http_response(response, callback):
        if callback == None:
            return HttpResponse(response, mimetype='application/json')
        else:
            return HttpResponse(callback + '(' + response + ')', mimetype='text/plain')

    @staticmethod
    def get_page_params(request):
        pageNo = None
        pageSize = None
        if 'page' in request.GET and len(request.GET['page']) > 0 and int(request.GET['page']) > 0:
            pageNo = int(request.GET['page'])
        if 'pageSize' in request.GET and len(request.GET['pageSize']) > 0 and int(request.GET['pageSize']) > 0:
            pageSize = int(request.GET['pageSize'])
        return (pageNo, pageSize)

    @staticmethod
    def get_callback_param(request):
        if 'callback' in request.GET and len(request.GET['callback']) > 0:
            return request.GET['callback']
        else:
            return None
    
if __name__ == "__main__":
    pass