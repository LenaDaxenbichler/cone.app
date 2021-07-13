import {SidebarMenu} from '../src/sidebar_menu.js'; 
///////////////////////////////////////////////////////////////////////////////
// cone.SidebarMenu helpers
///////////////////////////////////////////////////////////////////////////////

function create_sidebar_elem() {
    // create dummy sidebar element
    let sidebar_html = `
        <div id="sidebar_left">
          <div id="sidebar_content">
          </div>
          <div id="sidebar_footer">
            <div id="toggle-fluid">
              <i class="bi bi-lock-fill"></i>
              <span>Lock state</span>
            </div>
            <div id="sidebar-toggle-btn">
              <i class="bi bi-arrow-left-circle"></i>
            </div>
          </div>
        </div>
    `;
    // append dummy element to DOM
    $('body').append(sidebar_html);
}

///////////////////////////////////////////////////////////////////////////////
// cone.SidebarMenu tests
///////////////////////////////////////////////////////////////////////////////

QUnit.module('cone.SidebarMenu', hooks => {
    hooks.before(() => {
        console.log('Set up cone.SidebarMenu tests');
        cone.viewport = new cone.ViewPort();
    });

    hooks.after(() => {
        console.log('Tear down cone.SidebarMenu tests');
        cone.viewport = null;
    });

    QUnit.module('constructor', () => {
        hooks.before(() => {
            console.log('Set up cone.SidebarMenu tests');
        });
        hooks.after(() =>{
            console.log('Tear down cone.SidebarMenu tests');
        });

        QUnit.module('properties', hooks => {
            hooks.before(() => {
                console.log('Set up cone.SidebarMenu properties tests');

                // set viewport to desktop
                cone.viewport.state = 3;

                // create dummy sidebar
                create_sidebar_elem();
            });

            hooks.after(() =>{
                console.log('Tear down cone.SidebarMenu properties tests');

                // unset and remove sidebar
                cone.sidebar_menu = null;
                // remove dummy sidebar from DOM
                $('#sidebar_left').remove();
            });

            QUnit.test('elems', assert => {
                // initialize new SidebarMenu instance
                cone.SidebarMenu.initialize();
                let sidebar = cone.sidebar_menu;

                // Sidebar is child of cone.ViewPortAware class
                assert.ok(sidebar instanceof cone.ViewPortAware);

                // containing element
                assert.ok(sidebar.elem.is('div#sidebar_left'));

                // content
                assert.ok(sidebar.content.is('div#sidebar_content'));

                // sidebar is expanded on desktop load
                assert.false(sidebar.collapsed);

                // footer
                assert.ok(
                    sidebar.toggle_btn
                    .is('#sidebar_footer > #sidebar-toggle-btn')
                );
                assert.ok(
                    sidebar.toggle_arrow_elem
                    .is('#sidebar-toggle-btn > i')
                );
                assert.ok(
                    sidebar.lock_switch
                    .is('#sidebar_footer > #toggle-fluid')
                );
                assert.strictEqual(sidebar.cookie, null);

                // private methods exist
                assert.ok(sidebar._toggle_menu_handle);
                assert.ok(sidebar._toggle_lock);
            });
        });
    });

    QUnit.module('methods', hooks =>{
        hooks.before(() => {
            console.log('Set up cone.SidebarMenu method tests');
        });

        hooks.after(() => {
            console.log('Tear down cone.SidebarMenu method tests');
        });

        QUnit.module('unload', hooks => {
            let toggle_menu_origin = cone.SidebarMenu.prototype.toggle_menu,
                toggle_lock_origin = cone.SidebarMenu.prototype.toggle_lock,
                super_unload_origin = cone.ViewPortAware.prototype.unload;

            hooks.before(assert => {
                console.log('Set up cone.SidebarMenu.unload tests');

                // set viewport
                cone.viewport.state = 3;

                // create dummy sidebar element
                create_sidebar_elem();

                // overwrite methods to check for method calls
                cone.SidebarMenu.prototype.toggle_menu = function() {
                    assert.step('toggle_menu()');
                }
                cone.SidebarMenu.prototype.toggle_lock = function() {
                    assert.step('toggle_lock()');
                }

                // overwrite super.unload function
                cone.ViewPortAware.prototype.unload = function() {
                    assert.step('super.unload()');
                }
            });

            hooks.after(() => {
                console.log('Tear down cone.SidebarMenu.unload tests');

                // unset sidebar
                cone.sidebar_menu = null;
                // remove dummy element from DOM
                $('#sidebar_left').remove();

                // reset super.unload() function
                cone.ViewPortAware.prototype.unload = super_unload_origin;

                // reset methods after test completion
                cone.SidebarMenu.prototype.toggle_menu = toggle_menu_origin;
                cone.SidebarMenu.prototype.toggle_lock = toggle_lock_origin;
            });

            QUnit.test('unload()', assert => {
                // initialize new SidebarMenu instance
                cone.SidebarMenu.initialize();
                // second instance invokes unload in constructor
                cone.SidebarMenu.initialize();
                assert.verifySteps(['super.unload()']);

                // manually unload
                cone.sidebar_menu.unload();

                // trigger events to check for unbind
                cone.sidebar_menu.toggle_btn.trigger('click');
                cone.sidebar_menu.lock_switch.trigger('click');

                // super.unload has been called
                assert.verifySteps(['super.unload()']);
            });
        });

        QUnit.module('initial_load()', hooks => {
            let TestSidebarMenu,
                test_sidebar_menu;

            hooks.beforeEach(assert => {
                console.log('Set up cone.SidebarMenu.initial_load tests');
                // create dummy sidebar html elem
                create_sidebar_elem();

                // dummy class
                TestSidebarMenu = class extends cone.SidebarMenu {
                    assign_state() {
                        assert.step('assign_state()');
                    }
                    toggle_menu() {
                        assert.step('toggle_menu()');
                    }
                }
            });

            hooks.afterEach(() => {
                console.log('Tear down cone.SidebarMenu.initial_load tests');

                // unload and unset instance
                test_sidebar_menu.unload();
                test_sidebar_menu = null;
                // remove dummy element from DOM
                $('#sidebar_left').remove();
            });

            for (let i=0; i<vp_states.length; i++) {
                QUnit.test(`Viewport ${i}`, assert => {
                    // set viewport
                    cone.viewport.state = i;

                    // initialize Test Sidebar
                    test_sidebar_menu = new TestSidebarMenu($('#sidebar_left'));

                    assert.strictEqual(
                        test_sidebar_menu.vp_state,
                        cone.viewport.state
                    );
                    assert.verifySteps(['assign_state()']);

                    // sidebar cookie is null
                    assert.strictEqual(readCookie('sidebar'), null);

                    if (i === 0) {
                        // containing element is hidden on mobile viewport
                        assert.strictEqual(
                            test_sidebar_menu.elem.css('display'),
                            'none'
                        );
                    } else if (i === 2) {
                        // sidebar is collapsed on medium viewport
                        assert.strictEqual(test_sidebar_menu.collapsed, true);
                    } else if (i === 3) {
                        // sidebar is expanded on large viewport
                        assert.strictEqual(test_sidebar_menu.collapsed, false);
                    }
                });

                QUnit.test(`Viewport ${i} with cookie`, assert => {
                    // set viewport
                    cone.viewport.state = i;

                    // create dummy cookie
                    createCookie('sidebar', true, null);

                    // initialize Test Sidebar
                    test_sidebar_menu = new TestSidebarMenu($('#sidebar_left'));

                    assert.strictEqual(
                        test_sidebar_menu.vp_state,
                        cone.viewport.state
                    );
                    assert.verifySteps(['assign_state()']);

                    assert.strictEqual(readCookie('sidebar'), 'true');

                    if (i !== 0) {
                        // cookie state === collapsed if viewport is not mobile
                        assert.strictEqual(test_sidebar_menu.collapsed, true);

                        // lock switch is active if cookie exists
                        assert.ok(
                            test_sidebar_menu.lock_switch
                            .hasClass('active')
                        );

                        // trigger click on toggle button
                        test_sidebar_menu.toggle_btn.trigger('click');
                        // toggle_menu_handle called
                        assert.verifySteps(['toggle_menu()']);
                    }

                    // remove dummy cookie
                    createCookie('sidebar', '', -1);
                });
            }
        });

        QUnit.module('toggle_lock()', hooks => {
            let TestSidebarMenu,
                test_sidebar_menu;

            hooks.beforeEach(assert => {
                console.log('Set up cone.SidebarMenu.toggle_lock tests');

                // set viewport
                cone.viewport.state = 3;

                // create dummy sidebar element
                create_sidebar_elem();

                // dummy class
                TestSidebarMenu = class extends cone.SidebarMenu {
                    toggle_menu() {
                        assert.step('toggle_menu()');
                    }
                }
            });

            hooks.afterEach(() => {
                console.log('Tear down cone.SidebarMenu.toggle_lock tests');

                // unset sidebar
                test_sidebar_menu.unload();
                test_sidebar_menu = null;
                // remove dummy element from DOM
                $('#sidebar_left').remove();

                // delete dummy cookie
                createCookie('sidebar', '', -1);
            });

            QUnit.test('toggle_lock()', assert => {
                // create new SidebarMenu instance
                test_sidebar_menu = new TestSidebarMenu($('#sidebar_left'));

                // sidebar is collapsed on load
                assert.strictEqual(test_sidebar_menu.collapsed, false);

                // cookie is null
                assert.strictEqual(readCookie('sidebar'), null);

                // trigger click on lock switch (lock state)
                test_sidebar_menu.lock_switch.trigger('click');
                // lock switch is active
                assert.ok(test_sidebar_menu.lock_switch.hasClass('active'));
                // collapsed state has not changed
                assert.strictEqual(test_sidebar_menu.collapsed, false);
                // no cookie created after click
                assert.strictEqual(test_sidebar_menu.cookie, false);

                // trigger click on toggle button
                test_sidebar_menu.toggle_btn.trigger('click');

                // toggle_menu() called
                assert.verifySteps(['toggle_menu()']);
            });

            QUnit.test('toggle_lock() with cookie', assert => {
                // create dummy cookie
                createCookie('sidebar', true, null);
                assert.strictEqual(readCookie('sidebar'), 'true');

                // create new SidebarMenu instance
                test_sidebar_menu = new TestSidebarMenu($('#sidebar_left'));

                // lock switch is active
                assert.ok(test_sidebar_menu.lock_switch.hasClass('active'));

                // trigger unclick on lock switch
                test_sidebar_menu.lock_switch.trigger('click');
                // cookie is deleted
                assert.strictEqual(readCookie('sidebar'), null);

                // lock switch is not active after click
                assert.notOk(test_sidebar_menu.lock_switch.hasClass('active'));

                // trigger click on toggle button
                test_sidebar_menu.toggle_btn.trigger('click');
                assert.strictEqual(test_sidebar_menu.cookie, null);

                // toggle_menu() has been called
                assert.verifySteps(['toggle_menu()']);
            });
        });

        QUnit.module('viewport_changed()', hooks => {
            let TestSidebarMenu,
                test_sidebar_menu,
                VPA = cone.ViewPortAware,
                super_vp_changed_origin = VPA.prototype.viewport_changed;

            hooks.beforeEach(assert => {
                console.log('Set up cone.SidebarMenu.toggle_lock tests');

                // set viewport
                cone.viewport.state = 3;

                // create dummy sidebar element
                create_sidebar_elem();

                // dummy class
                TestSidebarMenu = class extends cone.SidebarMenu {
                    assign_state() {
                        assert.step(`assign_state(${this.collapsed})`);
                    }
                }

                // overwrite vp changed method to assert call
                VPA.prototype.viewport_changed = function(e) {
                    this.vp_state = e.state;
                    assert.step(`super.viewport_changed(${e.state})`);
                }
            });

            hooks.afterEach(() => {
                console.log('Tear down cone.SidebarMenu.toggle_lock tests');

                // unset sidebar
                test_sidebar_menu.unload();
                test_sidebar_menu = null;
                // remove dummy element from DOM
                $('#sidebar_left').remove();

                // reset vp changed method
                VPA.prototype.viewport_changed = super_vp_changed_origin;

                // delete dummy cookie
                createCookie('sidebar', '', -1);
            });

            QUnit.test('viewport_changed()', assert => {
                // create new SidebarMenu instance
                test_sidebar_menu = new TestSidebarMenu($('#sidebar_left'));

                // initial assign_state call on load
                assert.verifySteps([
                    'assign_state(false)'
                ]);

                // create dummy viewport changed event
                let resize_evt = $.Event('viewport_changed');

                for (let i=0; i<vp_states.length; i++) {
                    // set dummy viewport changed event
                    resize_evt.state = i;
                    // invoke viewport_changed method
                    test_sidebar_menu.viewport_changed(resize_evt);

                    let state;

                    assert.strictEqual(
                        test_sidebar_menu.vp_state,
                        resize_evt.state
                    );

                    if (i === 0) {
                        // sidebar is expanded on mobile viewport
                        assert.strictEqual(test_sidebar_menu.collapsed, false);
                        // element is hidden in mobile dropdown
                        assert.strictEqual(
                            test_sidebar_menu.elem.css('display'),
                            'none'
                        );
                        state = false;
                    } else if (i === 1) {
                        // sidebar is collapsed on small viewport
                        assert.strictEqual(test_sidebar_menu.collapsed, true);
                        // element is visible
                        assert.strictEqual(
                            test_sidebar_menu.elem.css('display'),
                            'block'
                        );
                        state = true;
                    } else if (i === 2) {
                        state = false;
                    } else if (i === 3) {
                        // sidebar is expanded on large viewport
                        assert.strictEqual(test_sidebar_menu.collapsed, false);
                        // element is visible
                        assert.strictEqual(
                            test_sidebar_menu.elem.css('display'),
                            'block'
                        );
                        state = false;
                    }

                    // methods have been called
                    assert.verifySteps([
                        `super.viewport_changed(${i})`,
                        `assign_state(${state})`
                    ]);
                }
            });

            QUnit.test('viewport small', assert => {
                // create new SidebarMenu instance
                test_sidebar_menu = new TestSidebarMenu($('#sidebar_left'));

                // initial assign_state call on load
                assert.verifySteps(['assign_state(false)']);

                // create dummy viewport changed event
                let resize_evt = $.Event('viewport_changed');
                // resize event state does not equal sidebar viewport state
                resize_evt.state = 1;
                test_sidebar_menu.vp_state = 2;

                // invoke viewport_changed method
                test_sidebar_menu.viewport_changed(resize_evt);
                // sidebar is collapsed
                assert.strictEqual(test_sidebar_menu.collapsed, true);
                // elem is visible
                assert.strictEqual(
                    test_sidebar_menu.elem.css('display'),
                    'block'
                );

                assert.verifySteps([
                    'super.viewport_changed(1)',
                    'assign_state(true)'
                ]);
            });

            QUnit.test('with cookie', assert => {
                let state;

                // create dummy viewport changed event
                let resize_evt = $.Event('viewport_changed');

                // create new SidebarMenu instance
                test_sidebar_menu = new TestSidebarMenu($('#sidebar_left'));

                // initial assign_state call on load
                assert.verifySteps(['assign_state(false)']);

                for (let i=0; i<vp_states.length; i++) {
                    if (i === 1) {
                        state = false;
                    } else {
                        state = true;
                    }

                    // create dummy cookie
                    test_sidebar_menu.cookie = state;

                    // set dummy viewport changed event state
                    resize_evt.state = i;

                    // invoke viewport_changed method
                    test_sidebar_menu.viewport_changed(resize_evt);

                    if (i === 0) {
                        // collapsed state can't change on mobile
                        assert.verifySteps([
                            `super.viewport_changed(${i})`,
                            `assign_state(false)`
                        ]);
                        assert.strictEqual(test_sidebar_menu.collapsed, false);
                    } else {
                        // collapsed cookie state gets applied
                        assert.verifySteps([
                            `super.viewport_changed(${i})`,
                            `assign_state(${state})`
                        ]);
                        assert.strictEqual(test_sidebar_menu.collapsed, state);
                    }
                }
            });
        });

        QUnit.module('assign_state()', hooks => {
            let TestMainMenuSidebar;

            hooks.beforeEach(assert => {
                console.log('Set up cone.SidebarMenu.toggle_lock tests');

                // set viewport
                cone.viewport.state = 3;

                // create dummy sidebar element
                create_sidebar_elem();

                // create dummy mainmenu sidebar element
                create_mm_sidebar_elem();

                // dummy class
                TestMainMenuSidebar = class extends cone.MainMenuSidebar {
                    static initialize(context) {
                        let elem = $('#mainmenu_sidebar');
                        cone.main_menu_sidebar = new TestMainMenuSidebar(elem);
                    }
                    collapse() {
                        assert.step('collapse()');
                    }
                    expand() {
                        assert.step('expand()');
                    }
                }
            });

            hooks.afterEach(() => {
                console.log('Tear down cone.SidebarMenu.toggle_lock tests');

                // unset sidebar
                cone.sidebar_menu.unload();
                cone.sidebar_menu = null;
                // remove dummy element from DOM
                $('#sidebar_left').remove();

                // unset main menu sidebar
                if (cone.main_menu_sidebar) {
                    cone.main_menu_sidebar.unload();
                    cone.main_menu_sidebar = null;
                }
            });

            QUnit.test('assign_state()', assert => {
                cone.SidebarMenu.initialize();

                // sidebar is expanded on load
                assert.strictEqual(cone.sidebar_menu.collapsed, false);
                assert.ok(cone.sidebar_menu.elem.hasClass('expanded'));
                assert.ok(
                    cone.sidebar_menu.toggle_arrow_elem
                    .hasClass('bi bi-arrow-left-circle')
                );

                // sidebar is collapsed
                cone.sidebar_menu.collapsed = true;
                // invoke assign_state() method
                cone.sidebar_menu.assign_state();
                assert.ok(cone.sidebar_menu.elem.hasClass('collapsed'));
                assert.ok(
                    cone.sidebar_menu.toggle_arrow_elem
                    .hasClass('bi bi-arrow-right-circle')
                );
            });

            QUnit.test('with mainmenu sidebar', assert => {
                // initialize SidebarMenu instance
                cone.SidebarMenu.initialize();
                // initialize mainmenu sidebar instance
                TestMainMenuSidebar.initialize();

                // expand
                cone.sidebar_menu.assign_state();

                //collapse
                cone.sidebar_menu.collapsed = true;
                cone.sidebar_menu.assign_state();

                assert.verifySteps([
                    'expand()',
                    'collapse()'
                ]);
            });
        });

        QUnit.module('toggle_menu()', hooks => {
            let TestSidebarMenu;

            hooks.before(assert => {
                console.log('Set up cone.SidebarMenu.toggle_menu tests');

                // set viewport
                cone.viewport.state = 3;

                // create dummy sidebar element
                create_sidebar_elem();

                // dummy class
                TestSidebarMenu = class extends cone.SidebarMenu {
                    assign_state() {
                        assert.step('assign_state()');
                    }
                }
            });

            hooks.after(() => {
                console.log('Tear down cone.SidebarMenu.toggle_menu tests');

                // unset sidebar
                cone.sidebar_menu.unload();
                cone.sidebar_menu = null;
                // remove dummy element from DOM
                $('#sidebar_left').remove();
            });

            QUnit.test('toggle_menu()', assert => {
                // initialize new SidebarMenu instance
                cone.sidebar_menu = new TestSidebarMenu();

                // initial assign_state call
                assert.verifySteps(['assign_state()']);

                // sidebar is expanded on load
                assert.strictEqual(cone.sidebar_menu.collapsed, false);

                // trigger click on toggle button
                cone.sidebar_menu.toggle_btn.trigger('click');
                // sidebar is collapsed after click
                assert.strictEqual(cone.sidebar_menu.collapsed, true);
                assert.verifySteps(['assign_state()']);

                // trigger click on toggle button
                cone.sidebar_menu.toggle_btn.trigger('click');
                // sidebar is expanded after click
                assert.strictEqual(cone.sidebar_menu.collapsed, false);
                assert.verifySteps(['assign_state()']);
            });
        });
    });
});