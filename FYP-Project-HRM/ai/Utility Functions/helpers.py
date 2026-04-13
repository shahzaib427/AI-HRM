# utils/helpers.py
import json
from datetime import datetime

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def parse_json_field(field_value, default=[]):
    """Parse JSON field safely"""
    if field_value:
        try:
            return json.loads(field_value)
        except:
            return default
    return default