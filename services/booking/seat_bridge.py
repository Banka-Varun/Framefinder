"""Deliver one normalized complete seat snapshot to the app.
Provider fetching/scheduling must be configured separately; no booking-site credentials are bundled.
Usage: python services/booking/seat_bridge.py snapshot.json
Set FRAMEFINDER_URL and SEAT_WEBHOOK_SECRET. Never put secrets in the snapshot.
"""
import hashlib,hmac,json,os,sys,urllib.request,urllib.error
from pathlib import Path

def sign_snapshot(snapshot,secret):
    body=json.dumps(snapshot,separators=(',',':'),ensure_ascii=False).encode()
    return body,hmac.new(secret.encode(),body,hashlib.sha256).hexdigest()

def deliver(snapshot):
    origin=os.environ['FRAMEFINDER_URL'].rstrip('/')
    if not origin.startswith('https://'):
        raise ValueError('Use your HTTPS deployment URL')
    body,signature=sign_snapshot(snapshot,os.environ['SEAT_WEBHOOK_SECRET'])
    req=urllib.request.Request(origin+'/api/v1/webhooks/seats',data=body,headers={'Content-Type':'application/json','x-seat-signature':signature},method='POST')
    with urllib.request.urlopen(req,timeout=20) as r:return json.load(r)

if __name__=='__main__':
    print(json.dumps(deliver(json.loads(Path(sys.argv[1]).read_text())),indent=2))
