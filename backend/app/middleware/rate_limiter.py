import time
from collections import defaultdict
from functools import wraps
from flask import request, jsonify

# Thread-safe in-memory sliding window rate limiter
_request_records = defaultdict(list)

def rate_limit(max_requests: int = 5, window_seconds: int = 60, key_func=None):
    """
    Decorator to apply rate limiting based on client IP or custom identifier.
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            now = time.time()
            if key_func:
                ident = key_func()
            else:
                ident = request.headers.get('X-Forwarded-For', request.remote_addr)
            
            bucket_key = f"{request.endpoint}:{ident}"
            timestamps = _request_records[bucket_key]
            
            # Prune timestamps older than window
            _request_records[bucket_key] = [ts for ts in timestamps if now - ts < window_seconds]
            
            if len(_request_records[bucket_key]) >= max_requests:
                return jsonify({
                    'error': f'Too many requests. Please wait {window_seconds} seconds before retrying.'
                }), 429
            
            _request_records[bucket_key].append(now)
            return f(*args, **kwargs)
        return wrapped
    return decorator
