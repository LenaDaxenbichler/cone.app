/*
 * cone.app public JS
 *
 * Requires:
 *     jquery
 *     bdajax
 *     typeahead.js
 */

// var livesearch_options = new Object();

// ensure namespace
if (window.cone === undefined) cone = {};

(function($) {

    // viewport
    cone.viewport = null;
    cone.VP_MOBILE = 0;
    cone.VP_SMALL = 1;
    cone.VP_MEDIUM = 2;
    cone.VP_LARGE = 3;

    // theme
    cone.theme_switcher = null;
    cone.default_themes = [
        '/static/light.css',
        '/static/dark.css'
    ];

    // layout components
    cone.sidebar_menu = null;
    cone.main_menu_top = null;
    cone.main_menu_sidebar = null;
    cone.navtree = null;
    cone.topnav = null;

    // searchbar
    cone.searchbar = null;
    cone.searchbar_handler = null;

    // content
    cone.content = null;

    $(function() {
        // create viewport singleton
        cone.viewport = new cone.ViewPort();

        bdajax.register(function(context) {
            cone.ThemeSwitcher.initialize(context, cone.default_themes);
            cone.Topnav.initialize(context);
            cone.MainMenuSidebar.initialize(context);
            cone.MainMenuTop.initialize(context);
            cone.SidebarMenu.initialize(context);
            cone.Searchbar.initialize(context);
            cone.Navtree.initialize(context);
            cone.Content.initialize(context);
        }, true);

        // bdajax.register(livesearch.binder.bind(livesearch), true);

    });

    // toggle vertical arrow icon
    cone.toggle_arrow = function(arrow) {
        if (arrow.hasClass('bi-chevron-up')) {
            arrow.removeClass('bi-chevron-up');
            arrow.addClass('bi-chevron-down');
        } else {
            arrow.removeClass('bi-chevron-down');
            arrow.addClass('bi-chevron-up');
        }
    };

    // viewport singleton
    cone.ViewPort = class {

        constructor() {
            this.state = null;
            this._mobile_query = `(max-width:559.9px)`;
            this._small_query = `(min-width:560px) and (max-width: 989.9px)`;
            this._medium_query = `(min-width:560px) and (max-width: 1200px)`;
            this.update_viewport();
            $(window).on('resize', this.resize_handle.bind(this));
        }

        update_viewport() {
            if (window.matchMedia(this._mobile_query).matches) {
                this.state = cone.VP_MOBILE;
            } else if (window.matchMedia(this._small_query).matches) {
                this.state = cone.VP_SMALL;
            } else if (window.matchMedia(this._medium_query).matches) {
                this.state = cone.VP_MEDIUM;
            } else {
                this.state = cone.VP_LARGE;
            }
        }

        resize_handle(e) {
            let state = this.state;
            this.update_viewport();
            if (e && state != this.state) {
                var evt = $.Event('viewport_changed');
                evt.state = this.state;
                $(window).trigger(evt);
            }
        }
    }

    cone.ViewPortAware = class {

        constructor() {
            this.vp_state = cone.viewport.state;
            this._viewport_changed_handle = this.viewport_changed.bind(this);
            $(window).on('viewport_changed', this._viewport_changed_handle);
        }

        unload() {
            $(window).off('viewport_changed', this._viewport_changed_handle);
        }

        viewport_changed(e) {
            this.vp_state = e.state;
        }
    }

    cone.Content = class {

        static initialize(context) {
            let elem = $('#page-content-wrapper', context);
            if (!elem.length) {
                return;
            }
            cone.content = new cone.Content(elem);
        }

        constructor(elem) {
            this.elem = elem;
            this.scrollbar = new cone.ScrollBarY(elem);
        }
    }

    cone.MainMenuItem = class extends cone.ViewPortAware {

        constructor(elem) {
            super(elem);
            this.elem = elem;
            this.children = elem.data('menu-items');
            if(!this.children){
                return;
            }
            this.menu = $(`
                <div class="cone-mainmenu-dropdown">
                    <ul class="mainmenu-dropdown">
                    </ul>
                </div>
            `);
            this.dd = $('ul', this.menu);
            this.arrow = $('i.dropdown-arrow', this.elem);
            this.render_dd();

            this._toggle = this.mouseenter_toggle.bind(this);

            if(this.vp_state === cone.VP_MOBILE){
                this.mv_to_mobile();
            } else {
                this.elem.off().on('mouseenter mouseleave', this._toggle);
                this.menu.off().on('mouseenter mouseleave', () => {
                    this.menu.toggle();
                })
            }
        }

        render_dd() {
            for (let i in this.children) {
                let menu_item = this.children[i];
                let dd_item = $(`
                  <li class="${menu_item.selected ? 'active': ''}">
                    <a href="${menu_item.url}"
                       title="${menu_item.title}">
                      <i class="${menu_item.icon}"></i>
                      <span>
                        ${menu_item.title ? menu_item.title : '&nbsp;'}
                      </span>
                    </a>
                  </li>
                `);
                this.dd.append(dd_item);
            }
            this.menu.appendTo('#layout');
        }

        mv_to_mobile() {
            if(cone.main_menu_sidebar) {
                return;
            }
            this.menu.off().detach().appendTo(this.elem).css('left', '0');
            this.elem.off();
            this.arrow.off().on('click', () => {
                this.menu.slideToggle('fast');
                cone.toggle_arrow(this.arrow);
            });
        }

        mv_to_top() {
            this.menu.detach().appendTo('#layout');
            this.arrow.off();
            this.elem.off().on('mouseenter mouseleave', this._toggle);
            this.menu.off().on('mouseenter mouseleave', () => {
                this.menu.toggle();
            })
        }

        mouseenter_toggle(e) {
            this.menu.offset({left: this.elem.offset().left});
            if(e.type === 'mouseenter') {
                this.menu.css('display', 'block');
            } else {
                this.menu.css('display', 'none');
            }
        }
    }

    cone.MainMenuTop = class extends cone.ViewPortAware {

        static initialize(context) {
            let elem = $('#main-menu', context);
            if(!elem.length) {
                return;
            }
            if(cone.main_menu_top !== null) {
                cone.main_menu_top.unload();
            }
            cone.main_menu_top = new cone.MainMenuTop(elem);
        }

        constructor(elem) {
            super();
            this.elem = elem;
            new cone.ScrollBarX(elem);
            this.main_menu_items = [];
            let that = this;
            $('li', elem).each(function() {
                let main_menu_item = new cone.MainMenuItem($(this));
                that.main_menu_items.push(main_menu_item);
            });

            if(this.vp_state !== cone.VP_MOBILE) {
                cone.topnav.logo.css('margin-right', '2rem');
            } else {
                cone.topnav.logo.css('margin-right', 'auto');
                if (cone.main_menu_sidebar) {
                    this.elem.css('display', 'none');
                }
            }

            this.handle_scrollbar();
        }

        unload() {
            super.unload();
        }

        handle_scrollbar() {
            for(let item of this.main_menu_items) {
                $(window)
                .on('dragstart', () => {
                    item.elem.off('mouseenter mouseleave', item._toggle);
                })
                .on('dragend', () => {
                    item.elem.on('mouseenter mouseleave', item._toggle);
                })   
            }
        }

        viewport_changed(e) {
            super.viewport_changed(e);
            if(this.vp_state === cone.VP_MOBILE) {
                cone.topnav.logo.css('margin-right', 'auto');
            } else {
                cone.topnav.logo.css('margin-right', '2rem');
            }
            if(cone.main_menu_sidebar) {
                if(this.vp_state === cone.VP_MOBILE) {
                    this.elem.css('display', 'none');
                } else {
                    this.elem.css('display', 'flex');
                }
                return;
            }

            for (let i in this.main_menu_items) {
                let item = this.main_menu_items[i];
                if (item.menu) {
                    if (this.vp_state === cone.VP_MOBILE) {
                        item.mv_to_mobile();
                    } else {
                        item.mv_to_top();
                    }
                }
            }
        }
    }

    cone.MainMenuSidebar = class extends cone.ViewPortAware {

        static initialize(context) {
            let elem = $('#mainmenu_sidebar', context);
            if(!elem.length) {
                return;
            }
            if(cone.main_menu_sidebar !== null) {
                cone.main_menu_sidebar.unload();
            }
            cone.main_menu_sidebar = new cone.MainMenuSidebar(elem);
        }

        constructor(elem) {
            super();
            this.elem = elem;
            this.items = $('>li:not(".sidebar-heading")', this.elem);
            this.arrows = $('i.dropdown-arrow', this.items);
            this.menus = $('.sb-menu', this.elem);

            this.initial_cookie();

            if (this.vp_state === cone.VP_MOBILE) {
                this.mv_to_mobile();
            }

            this._collapse = this.collapse.bind(this);
            this._expand = this.expand.bind(this);
        }

        unload() {
            super.unload();
            this.items.off();
            this.arrows.off();
        }

        initial_cookie() {
            let cookie = readCookie('sidebar menus');
            if(cookie) {
                this.display_data = cookie.split(',');
            } else {
                this.display_data = [];
                for(let elem of this.menus) {
                    this.display_data.push('none');
                }
            }
        }

        viewport_changed(e) {
            super.viewport_changed(e);
            if (this.vp_state === cone.VP_MOBILE) {
                this.mv_to_mobile();
            } 
            else {
                this.mv_to_sidebar();
            }
        }
    
        mv_to_mobile() {
            this.elem.detach()
            .appendTo(cone.topnav.content)
            .addClass('mobile');
        }

        mv_to_sidebar() {
            this.elem.detach()
            .prependTo(cone.sidebar_menu.content)
            .removeClass('mobile');
        }

        collapse() {
            $('ul', this.items).hide();
            this.arrows.off('click');

            for(let item of this.items) {
                let elem = $(item);
                let menu = $('ul', elem);

                elem.off().on('mouseenter', mouse_in);

                function mouse_in() {
                    elem.addClass('hover');
                    let elem_w = elem.outerWidth(),
                        menu_w = menu.outerWidth();
                    if(elem_w > menu_w) {
                        menu.css('width', elem_w);
                    } else {
                        elem.css('width', menu_w);
                    }
                    menu.show();
                }

                elem.on('mouseleave', () => {
                    menu.hide();
                    elem.removeClass('hover')
                        .css('width', 'auto');
                })

                // stop event on scrollbar drag
                $(window)
                .on('dragstart', () => {
                    elem.off('mouseenter', mouse_in);
                })
                .on('dragend', () => {
                    elem.on('mouseenter', mouse_in);
                })
            }
        }

        expand() {
            this.items.off('mouseenter mouseleave');

            for(let i = 0; i < this.menus.length; i++) {
                let elem = this.menus[i],
                    arrow = $('i.dropdown-arrow', elem),
                    menu = $('ul.cone-mainmenu-dropdown-sb', elem)
                ;

                menu.css('display', this.display_data[i]);

                if(menu.css('display') === 'block') {
                    arrow.removeClass('bi-chevron-down')
                         .addClass('bi-chevron-up');
                } else {
                    arrow.removeClass('bi-chevron-up')
                         .addClass('bi-chevron-down');
                }

                arrow.off().on('click', () => {
                    let display = menu.css('display') === 'block' ? 'none' : 'block' ;
                    menu.slideToggle('fast');
                    cone.toggle_arrow(arrow);
                    this.display_data[i] = display; 
                    createCookie('sidebar menus', this.display_data, null);
                });
            }
        }

    }

    cone.Topnav = class extends cone.ViewPortAware {

        static initialize(context) {
            let elem = $('#topnav', context);
            if (!elem.length) {
                return;
            }
            if(cone.topnav !== null) {
                cone.topnav.unload();
            }
            cone.topnav = new cone.Topnav(elem);
        }

        constructor(elem) {
            super();
            this.elem = elem;
            this.content = $('#topnav-content', elem);
            this.toggle_button = $('#mobile-menu-toggle', elem);
            this.logo = $('#cone-logo', elem);
            this.tb_dropdowns = $('#toolbar-top>li.dropdown', elem);
            this._toggle_menu_handle = this.toggle_menu.bind(this);
            this.toggle_button.on('click', this._toggle_menu_handle);

            if (this.vp_state === cone.VP_MOBILE) {
                this.content.hide();
                this.elem.addClass('mobile');
                this.tb_dropdowns.off().on('show.bs.dropdown', () => {
                    this.content.hide();
                });
            }

            // tmp
            this.pt = $('#personaltools');
            this.user =  $('#user');
            this.pt_handle();
            // end tmp
        }

        unload() {
            super.unload();
            this.toggle_button.off('click', this._toggle_menu_handle);
            this.tb_dropdowns.off('show.bs.dropdown');
        }

        toggle_menu() {
            this.content.slideToggle('fast');
            // slideToggle overrides display flex with block, we need flex
            if (this.content.css('display') === 'block') {
                this.content.css('display', 'flex');
            }
        }

        viewport_changed(e) {
            super.viewport_changed(e);
            if (this.vp_state === cone.VP_MOBILE) {
                this.content.hide();
                this.elem.addClass('mobile');
                // hide menu on toolbar click
                this.tb_dropdowns.off().on('show.bs.dropdown', () => {
                    this.content.hide();
                });
            } else {
                this.content.show();
                this.elem.removeClass('mobile');
                this.tb_dropdowns.off();
            }

            // tmp
            this.pt_handle();
            // end tmp
        }

        pt_handle() {
            // tmp
            if (this.vp_state === cone.VP_MOBILE) {
                this.pt.off('show.bs.dropdown').on('show.bs.dropdown', () => {
                    this.user.stop(true, true).slideDown('fast');
                    cone.toggle_arrow($('i.dropdown-arrow', '#personaltools'));
                });
                this.pt.off('hide.bs.dropdown').on('hide.bs.dropdown', () => {
                    this.user.stop(true, true).slideUp('fast');
                    cone.toggle_arrow($('i.dropdown-arrow', '#personaltools'));
                });
            } else {
                this.pt.off('show.bs.dropdown').on('show.bs.dropdown', () => {
                    this.user.show();
                });
                this.pt.off('hide.bs.dropdown').on('hide.bs.dropdown', () => {
                    this.user.hide();
                });
            }
        }
    }

    cone.SidebarMenu = class extends cone.ViewPortAware {

        static initialize(context) {
            let elem = $('#sidebar_left', context);
            if (!elem.length) {
                return;
            }
            if (cone.sidebar_menu !== null) {
                cone.sidebar_menu.unload();
            }
            cone.sidebar_menu = new cone.SidebarMenu(elem);
        }

        constructor(elem) {
            super();
            this.elem = elem;

            this.content = $('#sidebar_content', elem);
            //this.scrollbar = new cone.ScrollBarSidebar(elem);
            this.collapsed = false;

            this.toggle_btn = $('#sidebar-toggle-btn', elem);
            this.toggle_arrow_elem = $('i', this.toggle_btn);
            this.lock_switch = $('#toggle-fluid');
            this.cookie = null;
           
            this._toggle_menu_handle = this.toggle_menu.bind(this);
            this.toggle_btn.off('click').on('click', this._toggle_menu_handle);

            this.initial_load();

            this._toggle_lock = this.toggle_lock.bind(this);
            this.lock_switch.off('click').on('click', this._toggle_lock);
        }

        unload() {
            super.unload();
            this.toggle_btn.off('click', this._toggle_menu_handle);
            this.lock_switch.off('click', this._toggle_lock);
        }

        initial_load() {
            let cookie = readCookie('sidebar');
            let vp_state = this.vp_state;
            if (vp_state === cone.VP_MOBILE) {
                this.elem.hide();
            } 
            else if (cookie === null) {
                if(vp_state !== cone.VP_LARGE) {
                    this.collapsed = true;
                }
            } else {
                this.toggle_btn.off('click', this._toggle_menu_handle);
                this.cookie = cookie === 'true';
                this.collapsed = this.cookie;
                this.lock_switch.addClass('active');
            }

            this.assign_state();
        }

        toggle_lock() {
            if(readCookie('sidebar')) {
                createCookie('sidebar', '', -1);
                this.lock_switch.removeClass('active');
                this.toggle_btn.off().on('click', this._toggle_menu_handle);
                this.cookie = null;
            } else {
                this.lock_switch.addClass('active');
                createCookie('sidebar', this.collapsed, null);
                this.cookie = this.collapsed;
                this.toggle_btn.off('click', this._toggle_menu_handle);
            }
        }

        viewport_changed(e) {
            super.viewport_changed(e);
            if(this.vp_state === cone.VP_MOBILE) {
                this.collapsed = false;
                this.elem.hide();
            }
            else if (this.cookie !== null) {
                this.collapsed = this.cookie;
                this.elem.show();
            }
            else if(this.vp_state === cone.VP_SMALL) {
                this.elem.show();
                let state = this.vp_state === cone.VP_SMALL;
                if(state != this.collapsed) {
                    this.collapsed = state;
                }
            }
            else {
                this.collapsed = false;
                this.elem.show();
            }
            this.assign_state();
        }

        assign_state() {
            let elem_class = this.collapsed === true ? 'collapsed' : 'expanded';
            let button_class = 'bi bi-arrow-' + ((this.collapsed === true) ? 'right':'left') + '-circle';
            this.elem.attr('class', elem_class);
            this.toggle_arrow_elem.attr('class', button_class);

            if(cone.main_menu_sidebar !== null) {
                if(this.collapsed) {
                    cone.main_menu_sidebar.collapse();
                }
                else {
                    cone.main_menu_sidebar.expand();
                }
            }
        }

        toggle_menu() {
            this.collapsed = !this.collapsed;
            this.assign_state();
        }
    };


    cone.Navtree = class extends cone.ViewPortAware {

        static initialize(context) {
            let elem = $('#navtree', context);
            if (!elem.length) {
                return;
            }
            if (cone.navtree !== null) {
                cone.navtree.unload();
            }
            cone.navtree = new cone.Navtree(elem);
        }

        constructor(elem) {
            super();
            this.elem = elem;
            this.content = $('#navtree-content', elem);
            this.heading = $('#navtree-heading', elem);
            this.toggle_elems = $('li.navtreelevel_1', navtree);

            if (this.vp_state === cone.VP_MOBILE) {
                this.mv_to_mobile();
            }

            this._mouseenter_handle = this.align_width.bind(this);
            this.toggle_elems.on('mouseenter', this._mouseenter_handle);
            this._restore = this.restore_width.bind(this);
            this.toggle_elems.on('mouseleave', this._restore); //restore original size

            this.scrollbar_handle();
        }

        unload() {
            super.unload();
            this.heading.off('click');
            this.toggle_elems.off('mouseenter', this._mouseenter_handle)
                             .off('mouseleave', this._restore);
        }

        mv_to_mobile() {
            this.elem.detach().appendTo(cone.topnav.content).addClass('mobile');
            this.content.hide();
            this.heading.off('click').on('click', () => {
                this.content.slideToggle('fast');
            });
        }

        viewport_changed(e) {
            super.viewport_changed(e);
            if (this.vp_state === cone.VP_MOBILE) {
                this.mv_to_mobile();
            } else {
                this.elem.detach().appendTo(cone.sidebar_menu.content).removeClass('mobile');
                this.heading.off('click');
                this.content.show();
            }
        }

        align_width(evt) {
            let target = $(evt.currentTarget);
            target.addClass('hover');
            if (target.outerWidth() > $('ul', target).outerWidth()) {
                $('ul', target).css('width', target.outerWidth());
            } else {
                target.css('width', $('ul', target).outerWidth());
            }
        }

        restore_width(evt) {
            $(evt.currentTarget).css('width', 'auto');
            $(evt.currentTarget).removeClass('hover');
        }

        scrollbar_handle(){
            $(window)
            .on('dragstart', () => {
                this.toggle_elems.off('mouseenter', this._mouseenter_handle);
            })
            .on('dragend', () => {
                this.toggle_elems.on('mouseenter', this._mouseenter_handle);
            });
        }
    }

    cone.ThemeSwitcher = class {

        static initialize(context, modes) {
            let elem = $('#switch_mode', context);
            if (!elem.length) {
                return;
            }
            cone.theme_switcher = new cone.ThemeSwitcher(elem, modes);
        }

        constructor(elem, modes) {
            this.elem = elem;
            this.modes = modes;
            this.link = $('head #colormode-styles');
            this.elem.off('click').on('click', this.switch_theme.bind(this));
            let current = readCookie('modeswitch');
            if (!current) {
                current = modes[0];
            }
            this.current = current;
        }

        get current() {
            return this.link.attr('href');
        }

        set current(value) {
            this.link.attr('href', value);
            createCookie('modeswitch', value, null);
            let checked = value === this.modes[0] ? false : true;
            this.elem.prop('checked', checked);
        }

        switch_theme(e) {
            e.stopPropagation();
            let modes = this.modes;
            this.current = this.current === modes[0] ? modes[1] : modes[0];
        }
    };

    cone.Searchbar = class extends cone.ViewPortAware {

        static initialize(context) {
            let elem = $('#cone-searchbar', context);
            if (!elem.length) {
                return;
            }
            if (cone.searchbar !== null) {
                cone.searchbar.unload();
            }
            cone.searchbar = new cone.Searchbar(elem);
        }

        constructor(elem) {
            super();
            this.elem = elem;
            this.search_text = $('#livesearch-input', this.elem);
            this.search_group = $('#livesearch-group', this.elem);
            this.dd = $('#cone-livesearch-dropdown', this.elem);

            if(this.vp_state === cone.VP_SMALL || this.vp_state === cone.VP_MEDIUM ) {
                this.dd.addClass('dropdown-menu-end');
                this.search_text.detach().prependTo(this.dd);
            }
        }

        unload() {
            // placeholder
        }

        viewport_changed(e) {
            super.viewport_changed(e);
            if(this.vp_state === cone.VP_SMALL || this.vp_state === cone.VP_MEDIUM) {
                this.dd.addClass('dropdown-menu-end');
                this.search_text.detach().prependTo(this.dd);
            } else {
                this.search_text.detach().prependTo(this.search_group);
                this.dd.removeClass('dropdown-menu-end');
            }
        }
    }

    // livesearch = {
    //     binder: function(context) {
    //         var livesearch_source = new Bloodhound({
    //             datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
    //             queryTokenizer: Bloodhound.tokenizers.whitespace,
    //             remote: 'livesearch?term=%QUERY'
    //         });
    //         livesearch_source.initialize();
    //         var input = $('input#livesearch');
    //         var options = {
    //             name: 'livesearch',
    //             displayKey: 'value',
    //             source: livesearch_source.ttAdapter()
    //         };
    //         $.extend(options, livesearch_options);
    //         input.typeahead(null, options);
    //     }
    // };

})(jQuery);
