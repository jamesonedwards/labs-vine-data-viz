from vine import Vine

class VineLabs(Vine):
    def user_timeline(self, user_id_, page=None, size=None):
        return self._call("timelines/users/%s" % user_id_, params={"page": page, "size": size})["data"]

    # TODO: For some reason this doesn't seem to return anything for any postId.
    def get_post(self, post_id_):
        return self._call("timelines/posts/%s" % post_id_)["data"]
