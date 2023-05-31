"""Source mapping for JS"""
import re

import requests
import sourcemap

cachedurls = {}


def get_info(url, lineno, column):
    """Gets info about a particular URL in a stack trace"""
    if url not in cachedurls:
        cachedurls[url] = requests.get(url, timeout=10).text
    js = cachedurls[url]
    path = sourcemap.discover(js)
    parts = url.split("/")
    urlbase = "/".join(parts[0 : len(parts) - 1])
    mapurl = urlbase + "/" + path
    if mapurl not in cachedurls:
        cachedurls[mapurl] = requests.get(mapurl, timeout=10).text
    smap = cachedurls[mapurl]
    index = sourcemap.loads(smap)
    token = index.lookup(line=lineno, column=column)
    return f"{token} ({token.src}:{token.src_line})"


def map_stacktrace(txt):
    """Parses a string stacktrace, returning an array of mapped frames in the trace."""
    res = []
    for line in txt.split("\n"):
        m = re.search(r"\S+@(http[s]?://[^/]+[^:]*):(\d+):(\d+)", line)
        if m is not None:
            url = m.group(1)
            lineno = int(m.group(2)) - 1
            column = int(m.group(3))
            res.append(get_info(url, lineno, column))
    return res
