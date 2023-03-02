import re

import requests
import sourcemap

cachedurls = {}

def get_info(url,lineno,column):
    """Gets info about a particular URL in a stack trace"""
    if url not in cachedurls:
        cachedurls[url] = requests.get(url,timeout=10).text
    js = cachedurls[url]
    path = sourcemap.discover(js)
    parts = url.split("/")
    urlbase = "/".join(parts[0:len(parts)-1])
    mapurl = urlbase + "/" + path
    if mapurl not in cachedurls:
        cachedurls[mapurl] = requests.get(mapurl,timeout=10).text
    smap = cachedurls[mapurl]
    index = sourcemap.loads(smap)
    token = index.lookup(line=lineno,column=column)
    return f"{token} ({token.src}:{token.src_line})"

def map_stacktrace(str):
    """Parses a string stacktrace, returning an array of mapped frames in the trace."""
    res = []
    for line in str.split("\n"):
        m = re.search(r"\s+at \S+ \((http[s]?://[^/]+[^:]*):(\d+):(\d+)\)",line)
        if m is not None:
            url = m.group(1)
            lineno = int(m.group(2))-1
            column = int(m.group(3))
            res.append(get_info(url,lineno,column))
    return res

if __name__ == "__main__":
    stk = """
        
    MastoHttpUnauthorizedError: The access token is invalid
        at W (https://www.mastodonlistmanager.org/static/js/916.0e3d9032.chunk.js:2:88193)
        at n.<anonymous> (https://www.mastodonlistmanager.org/static/js/916.0e3d9032.chunk.js:2:98395)
        at p (https://www.mastodonlistmanager.org/static/js/144.ab1fc33d.chunk.js:2:5828)
        at Generator.<anonymous> (https://www.mastodonlistmanager.org/static/js/144.ab1fc33d.chunk.js:2:7171)
        at Generator.next (https://www.mastodonlistmanager.org/static/js/144.ab1fc33d.chunk.js:2:6191)
        at a (https://www.mastodonlistmanager.org/static/js/916.0e3d9032.chunk.js:2:95913)
    """

    strace = map_stacktrace(stk)
    for frame in strace:
        print(frame)