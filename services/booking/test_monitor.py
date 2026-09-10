import copy
from datetime import datetime, timezone, timedelta
import tempfile
import unittest
from monitor import Monitor
from legacy_adapter import movie_space_candidates, newly_available, parse_movie_url, retry_delay

NOW=datetime(2030,1,1,6,tzinfo=timezone.utc)
ALERT={'id':'sample-alert','title':'Example Film','eventCode':'ET12345','regionCode':'HYD','city':'Hyderabad','date':'2030-01-02','timeFrom':'18:00','timeTo':'22:00','timeZone':'Asia/Kolkata','language':'Telugu','edition':'Original release','formats':['2D','PCX'],'theaters':[{'venueCode':'PRHN','name':'Prasads Multiplex: Hyderabad'},{'venueCode':'AMBH','name':'AMB Cinemas: Gachibowli'}],'kind':'booking-open'}
SHOW={'provider':'fixture','eventCode':'ET12345','sessionId':'session-1','venueCode':'PRHN','venueName':'Prasads Multiplex: Hyderabad','regionCode':'HYD','date':'2030-01-02','time':'19:00','language':'Telugu','edition':'Original release','format':'PCX','bookable':True}
class MonitorTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.path=self.temp.name+'/state.sqlite';self.m=Monitor(self.path);self.t=NOW
 def tearDown(self):self.m.db.close();self.temp.cleanup()
 def process(self,show=None,alert=None):
  self.t+=timedelta(seconds=1)
  return self.m.process({'schemaVersion':1,'alerts':[alert or ALERT]},{'schemaVersion':1,'observedAt':self.t.isoformat(),'shows':[show or SHOW]},now=self.t)
 def test_first_open_and_repeat_restart(self):
  self.assertEqual(len(self.process()),1);self.assertEqual(self.process(),[])
  self.m.db.close();self.m=Monitor(self.path);self.assertEqual(self.process(),[])
  self.assertEqual(len(self.m.pending()),1)
 def test_closed_open_then_reopening_is_not_duplicate(self):
  self.assertEqual(self.process({**SHOW,'bookable':False}),[])
  self.assertEqual(len(self.process()),1)
  self.process({**SHOW,'bookable':False});self.assertEqual(self.process(),[])
 def test_listing_unknown_never_alerts(self):
  self.assertEqual(self.process({**SHOW,'bookable':None}),[])
  self.assertEqual(len(self.process()),1)
 def test_each_matching_theater_can_alert(self):
  self.assertEqual(len(self.process()),1)
  self.assertEqual(len(self.process({**SHOW,'venueCode':'AMBH','venueName':'AMB Cinemas: Gachibowli'})),1)
 def test_wrong_movie_version_format_language_date_time_and_city(self):
  for field,value in [('eventCode','ET54321'),('edition','Re-release'),('format','3D'),('language','English'),('date','2030-01-03'),('time','17:59'),('regionCode','BLR'),('venueCode','OTHER')]:
   with self.subTest(field=field):self.assertEqual(self.process({**SHOW,field:value}),[])
 def test_missing_event_id_never_falls_back_to_title(self):
  self.assertEqual(self.process(alert={**ALERT,'eventCode':None}),[])
 def test_new_session_after_initial_poll(self):
  self.process();self.assertEqual(len(self.process({**SHOW,'sessionId':'session-2'})),1)
 def test_unknown_does_not_erase_prior_status(self):
  self.process();self.process({**SHOW,'bookable':None});self.assertEqual(self.process(),[])
 def test_stale_and_malformed_do_not_change_state(self):
  for observed in [(NOW-timedelta(minutes=6)).isoformat(),(NOW+timedelta(minutes=6)).isoformat()]:
   with self.assertRaises(ValueError):self.m.process({'schemaVersion':1,'alerts':[ALERT]},{'schemaVersion':1,'observedAt':observed,'shows':[SHOW]},NOW)
  self.assertEqual(self.m.pending(),[])
 def test_outbox_stays_pending_until_acknowledged(self):
  event=self.process()[0];self.assertEqual(len(self.m.pending()),1)
  self.m.acknowledge(event['eventKey']);self.assertEqual(self.m.pending(),[])
 def test_legacy_listing_is_not_bookable(self):
  data={'data':{'showtimeWidgets':[{'type':'groupList','data':[{'data':[{'additionalData':{'venueName':'Prasads'}}]}]}]}}
  self.assertIsNone(movie_space_candidates(data)[0]['bookable'])
 def test_seat_baseline_and_set_changes(self):
  self.assertEqual(newly_available(None,{'A':['1','2']}),{})
  self.assertEqual(newly_available({'A':['1','2']},{'A':['2','3']}),{'A':['3']})
 def test_url_and_rate_limit_handling(self):
  self.assertEqual(parse_movie_url('https://in.bookmyshow.com/movies/hyderabad/example/ET12345')['eventCode'],'ET12345')
  with self.assertRaises(ValueError):parse_movie_url('https://in.bookmyshow.com.evil.test/ET12345')
  self.assertEqual(retry_delay(429,'120'),120)
  self.assertIsNone(retry_delay(403));self.assertGreaterEqual(retry_delay(429),60)
if __name__=='__main__':unittest.main()
