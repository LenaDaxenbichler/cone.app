# -*- coding: utf-8 -*-
from cone.app import testing
from cone.app.model import BaseNode
from cone.app.model import Properties
from cone.app.utils import add_creation_metadata
from cone.app.utils import app_config
from cone.app.utils import DatetimeHelper
from cone.app.utils import principal_data
from cone.app.utils import safe_decode
from cone.app.utils import safe_encode
from cone.app.utils import timestamp
from cone.app.utils import update_creation_metadata
from datetime import datetime
from node.tests import NodeTestCase
import cone.app


class TestUtils(NodeTestCase):
    layer = testing.security

    def test_app_config(self):
        # Fetch application configuration
        cfg = app_config()
        self.assertTrue(isinstance(cfg, Properties))

    def test_principal_data(self):
        # Fetch principal data
        self.assertEqual(principal_data('manager').items(), [
            (u'fullname', u'Manager User'),
            (u'email', u'manager@bar.com')
        ])
        self.assertEqual(principal_data('inexistent'), {})

        # If UGM implementation raises an exception when trying to fetch the
        # principal it get logged
        old_ugm = cone.app.cfg.auth
        cone.app.cfg.auth = None

        self.assertEqual(principal_data('inexistent'), {})
        # XXX: check logs

        cone.app.cfg.auth = old_ugm

    def test_safe_encode(self):
        self.assertEqual(safe_encode(u'äöü'), b'\xc3\xa4\xc3\xb6\xc3\xbc')
        self.assertEqual(safe_encode(b'already_string'), b'already_string')

    def test_safe_decode(self):
        self.assertEqual(safe_decode(b'\xc3\xa4\xc3\xb6\xc3\xbc'), u'äöü')
        self.assertEqual(safe_decode(u'already_unicode'), u'already_unicode')

    def test_DatetimeHelper(self):
        # Helper object for read/write operations with datetime values
        helper = DatetimeHelper()

        dt = datetime(2010, 1, 1, 10, 15)
        self.assertEqual(dt.isoformat(), '2010-01-01T10:15:00')
        self.assertEqual(helper.dt_to_iso(dt), '2010-01-01T10:15:00')

        dt = datetime(2010, 1, 1, 10, 15, 10, 5)
        self.assertEqual(dt.isoformat(), '2010-01-01T10:15:10.000005')
        self.assertEqual(helper.dt_to_iso(dt), '2010-01-01T10:15:10')

        self.assertEqual(
            helper.dt_from_iso('2010-01-01T10:15:00'),
            datetime(2010, 1, 1, 10, 15)
        )
        self.assertEqual(
            helper.dt_from_iso(u'2010-01-01T10:15:00'),
            datetime(2010, 1, 1, 10, 15)
        )

        self.assertEqual(helper.r_value(u'äöü'), u'äöü')
        self.assertEqual(helper.r_value(b'\xc3\xa4\xc3\xb6\xc3\xbc'), u'äöü')
        self.assertEqual(
            helper.r_value('2010-01-01T10:15:00'),
            datetime(2010, 1, 1, 10, 15)
        )

        self.assertEqual(helper.w_value(b'abc'), u'abc')
        self.assertEqual(helper.w_value(u'abc'), u'abc')
        self.assertEqual(helper.w_value(u'äöü'), u'äöü')
        self.assertEqual(helper.w_value(dt), '2010-01-01T10:15:10')

    def test_timestamp(self):
        self.check_output("""
        datetime.datetime(..., ..., ..., ..., ..., ..., ...)
        """, repr(timestamp()))

    def test_creation_metadata(self):
        # Creation metadata
        node = BaseNode()
        self.layer.login('editor')

        self.assertFalse('creator' in node.attrs)
        self.assertFalse('created' in node.attrs)
        self.assertFalse('modified' in node.attrs)

        add_creation_metadata(self.layer.new_request(), node.attrs)

        self.assertTrue('creator' in node.attrs)
        self.assertTrue('created' in node.attrs)
        self.assertTrue('modified' in node.attrs)

        self.assertEqual(node.attrs['creator'], 'editor')
        created = node.attrs['created']
        modified = node.attrs['modified']

        self.assertTrue(isinstance(created, datetime))
        self.assertTrue(isinstance(modified, datetime))
        self.assertTrue(created == modified)

        update_creation_metadata(self.layer.new_request(), node.attrs)

        self.assertTrue(isinstance(node.attrs['created'], datetime))
        self.assertTrue(isinstance(node.attrs['modified'], datetime))
        self.assertTrue(created == node.attrs['created'])
        self.assertFalse(created == node.attrs['modified'])

        self.layer.logout()
