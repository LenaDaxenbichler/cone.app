cone.app.security
-----------------

Imports::

    >>> from cone.app import security
    >>> from cone.app.interfaces import IOwnerSupport
    >>> from cone.app.interfaces import IPrincipalACL
    >>> from cone.app.model import BaseNode
    >>> from cone.app.security import DEFAULT_ACL
    >>> from cone.app.security import OwnerSupport
    >>> from cone.app.security import PrincipalACL
    >>> from cone.app.security import acl_registry
    >>> from cone.app.security import authenticate
    >>> from cone.app.security import authenticated_user
    >>> from cone.app.security import groups_callback
    >>> from cone.app.security import logger
    >>> from cone.app.security import principal_by_id
    >>> from cone.app.security import search_for_principals
    >>> from node.utils import instance_property
    >>> from plumber import default
    >>> from plumber import plumbing
    >>> from pyramid.interfaces import IAuthenticationPolicy
    >>> from pyramid.security import authenticated_userid
    >>> from pyramid.security import has_permission
    >>> from pyramid.threadlocal import get_current_registry
    >>> import cone.app
    >>> import logging

Superuser credentials are set on application startup by main function in
cone.app.__init__::

    >>> security.ADMIN_USER = 'user'
    >>> security.ADMIN_PASSWORD = 'secret'

``authenticated_user``::

    >>> authenticated_user(layer.current_request)

    >>> layer.login('manager')
    >>> authenticated_user(layer.current_request)
    <User object 'manager' at ...>

    >>> layer.logout()

``principal_by_id``::

    >>> principal_by_id('manager')
    <User object 'manager' at ...>

    >>> principal_by_id('group:group1')
    <Group object 'group1' at ...>

    >>> principal_by_id('inexistent')

``search_for_principals``::

    >>> search_for_principals('viewer')
    [u'viewer']

    >>> search_for_principals('group*')
    [u'group:group1']

The default ACL::

    >>> security.DEFAULT_ACL
    [('Allow', 'system.Authenticated', ['view']), 
    ('Allow', 'role:viewer', ['view', 'list']), 
    ('Allow', 'role:editor', ['view', 'list', 'add', 'edit']), 
    ('Allow', 'role:admin', ['view', 'list', 'add', 'edit', 'delete', 'cut', 
    'copy', 'paste', 'manage_permissions', 'change_state']), 
    ('Allow', 'role:manager', ['view', 'list', 'add', 'edit', 'delete', 'cut', 
    'copy', 'paste', 'manage_permissions', 'change_state', 'manage']), 
    ('Allow', 'role:owner', ['view', 'list', 'add', 'edit', 'delete', 'cut', 
    'copy', 'paste', 'manage_permissions', 'change_state']), 
    ('Allow', 'system.Everyone', ['login']), 
    ('Deny', 'system.Everyone', <pyramid.security.AllPermissionsList object at ...>)]

Base security tests::

    >>> get_current_registry().queryUtility(IAuthenticationPolicy)
    <pyramid.authentication.AuthTktAuthenticationPolicy object at ...>

    >>> layer.new_request()
    <cone.app.testing.DummyRequest object at ...>

    >>> layer.current_request.registry
    <BaseGlobalComponents base>

    >>> layer.login('inexistent')
    >>> authenticated_userid(layer.current_request)

Create some security context for testing::

    >>> class ACLTest(object):
    ...     __acl__ = DEFAULT_ACL
    >>> context = ACLTest()

Authenticate as default user::

    >>> layer.login('user')
    >>> authenticated_userid(layer.current_request)
    'user'

    >>> has_permission('manage', context, layer.current_request)
    <ACLAllowed instance ...

    >>> layer.login('viewer')
    >>> authenticated_userid(layer.current_request)
    'viewer'

    >>> has_permission('manage', context, layer.current_request)
    <ACLDenied instance ...

    >>> layer.logout()
    >>> authenticated_userid(layer.current_request)

    >>> has_permission('manage', context, layer.current_request)
    <ACLDenied instance ...

ACLRegistry::

    >>> class SomeModel(object): pass

    >>> acl = [('Allow', 'role:viewer', ['view'])]
    >>> acl_registry.register(acl, SomeModel)

    >>> acl = [('Allow', 'role:viewer', ['edit'])]
    >>> acl_registry.register(acl, node_info_name='some_model')

    >>> acl = [('Allow', 'role:viewer', ['delete'])]
    >>> acl_registry.register(acl, SomeModel, 'some_model')

    >>> acl_registry.lookup(None, None, [('Allow', 'role:viewer', ['add'])])
    [('Allow', 'role:viewer', ['add'])]

    >>> acl_registry.lookup(SomeModel)
    [('Allow', 'role:viewer', ['view'])]

    >>> acl_registry.lookup(node_info_name='some_model')
    [('Allow', 'role:viewer', ['edit'])]

    >>> acl_registry.lookup(SomeModel, 'some_model')
    [('Allow', 'role:viewer', ['delete'])]

OwnerSupport::

    >>> @plumbing(OwnerSupport)
    ... class OwnerSupportNode(BaseNode):
    ...     pass

    >>> ownersupportnode = OwnerSupportNode()
    >>> ownersupportnode.owner

    >>> ownersupportnode.__acl__
    [('Allow', 'system.Authenticated', ['view']), ...]

    >>> layer.login('sepp')
    >>> authenticated_userid(layer.current_request)
    'sepp'

    >>> ownersupportnode = OwnerSupportNode()
    >>> ownersupportnode.owner
    'sepp'

    >>> ownersupportnode.attrs['owner']
    'sepp'

    >>> ownersupportnode.__acl__
    [('Allow', 'sepp', ['view', 'list', 'add', 'edit', 'delete', 'cut', 
    'copy', 'paste', 'manage_permissions', 'change_state']), 
    ('Allow', 'system.Authenticated', ['view']), 
    ('Allow', 'role:viewer', ['view', 'list']), 
    ('Allow', 'role:editor', ['view', 'list', 'add', 'edit']), 
    ('Allow', 'role:admin', ['view', 'list', 'add', 'edit', 'delete', 'cut', 
    'copy', 'paste', 'manage_permissions', 'change_state']), 
    ('Allow', 'role:manager', ['view', 'list', 'add', 'edit', 'delete', 'cut', 
    'copy', 'paste', 'manage_permissions', 'change_state', 'manage']), 
    ('Allow', 'role:owner', ['view', 'list', 'add', 'edit', 'delete', 'cut', 
    'copy', 'paste', 'manage_permissions', 'change_state']), 
    ('Allow', 'system.Everyone', ['login']), 
    ('Deny', 'system.Everyone', <pyramid.security.AllPermissionsList object at ...>)]

    >>> layer.login('viewer')
    >>> has_permission('delete', ownersupportnode, layer.current_request)
    <ACLDenied instance ...

    >>> layer.login('sepp')
    >>> has_permission('delete', ownersupportnode, layer.current_request)
    <ACLAllowed instance ...

    >>> @plumbing(OwnerSupport)
    ... class NoOwnerACLOnBaseNode(BaseNode):
    ...     @property
    ...     def __acl__(self):
    ...         return [('Allow', 'role:viewer', ['view'])]

    >>> ownersupportnode = NoOwnerACLOnBaseNode()
    >>> ownersupportnode.owner
    'sepp'

    >>> ownersupportnode.__acl__
    [('Allow', 'role:viewer', ['view'])]

    >>> layer.logout()

PrincipalACL. PrincipalACL is an abstract class. Directly mixing in causes an
error on use::

    >>> @plumbing(PrincipalACL)
    ... class PrincipalACLNode(BaseNode):
    ...     pass

    >>> node = PrincipalACLNode()
    >>> node.__acl__
    Traceback (most recent call last):
      ...
    NotImplementedError: Abstract ``PrincipalACL`` does not 
    implement ``principal_roles``.

Concrete PrincipalACL implementation. Implements principal_roles property::

    >>> class MyPrincipalACL(PrincipalACL):
    ...     @default
    ...     @instance_property
    ...     def principal_roles(self):
    ...         return dict()

    >>> @plumbing(MyPrincipalACL)
    ... class MyPrincipalACLNode(BaseNode):
    ...     pass

    >>> node = MyPrincipalACLNode()
    >>> IPrincipalACL.providedBy(node)
    True

    >>> node.principal_roles['someuser'] = ['manager']
    >>> node.principal_roles['otheruser'] = ['editor']
    >>> node.principal_roles['group:some_group'] = ['editor', 'manager']

    >>> node.__acl__
    [('Allow', 'someuser', ['cut', 'edit', 'copy', 'manage', 'list', 'add', 
    'change_state', 'view', 'paste', 'manage_permissions', 'delete']), 
    ('Allow', 'otheruser', ['edit', 'add', 'list', 'view']), 
    ('Allow', 'group:some_group', ['cut', 'edit', 'copy', 'manage', 'list', 
    'add', 'change_state', 'view', 'paste', 'manage_permissions', 'delete']), 
    ('Allow', 'system.Authenticated', ['view']), 
    ('Allow', 'role:viewer', ['view', 'list']), 
    ...
    ('Deny', 'system.Everyone', <pyramid.security.AllPermissionsList object at ...>)]

PrincipalACL role inheritance::

    >>> child = node['child'] = MyPrincipalACLNode()
    >>> child.principal_roles['someuser'] = ['editor']
    >>> child.__acl__
    [('Allow', 'someuser', ['edit', 'add', 'list', 'view']), 
    ('Allow', 'system.Authenticated', ['view']), 
    ('Allow', 'role:viewer', ['view', 'list']), 
    ...
    ('Deny', 'system.Everyone', <pyramid.security.AllPermissionsList object at ...>)]

    >>> subchild = child['child'] = MyPrincipalACLNode()
    >>> subchild.role_inheritance = True
    >>> subchild.principal_roles['otheruser'] = ['admin']
    >>> subchild.aggregated_roles_for('inexistent')
    []

    >>> subchild.aggregated_roles_for('someuser')
    ['manager', 'editor']

    >>> subchild.aggregated_roles_for('otheruser')
    ['admin', 'editor']

    >>> subchild.__acl__
    [('Allow', 'someuser', ['cut', 'edit', 'copy', 'manage', 'list', 'add', 
    'change_state', 'view', 'paste', 'manage_permissions', 'delete']), 
    ('Allow', 'otheruser', ['cut', 'edit', 'copy', 'list', 'add', 
    'change_state', 'view', 'paste', 'manage_permissions', 'delete']), 
    ('Allow', 'group:some_group', ['cut', 'edit', 'copy', 'manage', 'list', 
    'add', 'change_state', 'view', 'paste', 'manage_permissions', 'delete']), 
    ('Allow', 'system.Authenticated', ['view']), 
    ...
    ('Deny', 'system.Everyone', <pyramid.security.AllPermissionsList object at ...>)]

Principal roles get inherited even if some parent does not provide principal
roles::

    >>> child = node['no_principal_roles'] = BaseNode()
    >>> subchild = child['no_principal_roles'] =  MyPrincipalACLNode()
    >>> subchild.aggregated_roles_for('group:some_group')
    ['manager', 'editor']

If principal role found which is not provided by plumbing endpoint acl, this
role does not grant any permissions::

    >>> node = MyPrincipalACLNode()
    >>> node.principal_roles['someuser'] = ['inexistent_role']
    >>> node.__acl__
    [('Allow', 'someuser', []), 
    ('Allow', 'system.Authenticated', ['view']), 
    ('Allow', 'role:viewer', ['view', 'list']), 
    ...
    ('Deny', 'system.Everyone', <pyramid.security.AllPermissionsList object at ...>)]

If an authentication plugin raises an error when calling ``authenticate``, an
error message is logged::

    >>> class TestHandler(logging.StreamHandler):
    ...     def handle(self, record):
    ...         print record

    >>> handler = TestHandler()

    >>> logger.addHandler(handler)
    >>> logger.setLevel(logging.DEBUG)

    >>> old_ugm = cone.app.cfg.auth
    >>> cone.app.cfg.auth = object()

    >>> request = layer.current_request

    >>> authenticate(request, 'foo', 'foo')
    <LogRecord: cone.app, 30, ...security.py, ..., 
    "Authentication plugin <type 'object'> raised an Exception while trying 
    to authenticate: 'object' object has no attribute 'users'">

Test Group callback, also logs if an error occurs::

    >>> layer.login('user')
    >>> request = layer.current_request
    >>> groups_callback('user', request)
    [u'role:manager']

    >>> layer.logout()

    >>> groups_callback('foo', layer.new_request())
    <LogRecord: cone.app, 40, 
    ...security.py, ..., "'object' object has no attribute 'users'">
    []

Cleanup::

    >>> logger.setLevel(logging.INFO)
    >>> logger.removeHandler(handler)
    >>> cone.app.cfg.auth = old_ugm
