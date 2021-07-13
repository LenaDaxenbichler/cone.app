import {toggle_arrow} from '../src/toggle_arrow.js'

///////////////////////////////////////////////////////////////////////////////
// cone.toggle_arrow function test
///////////////////////////////////////////////////////////////////////////////

QUnit.test('toggle_arrow', assert => {
    console.log('Run toggle_arrow test');

    // set variables
    let up = 'bi-chevron-up',
        down = 'bi-chevron-down',
        arrow_up = $(`<i class="dropdown-arrow ${up}" />`),
        arrow_down = $(`<i class="dropdown-arrow ${down}" />`);

    // toggle arrow from up to down
    toggle_arrow(arrow_up);
    assert.strictEqual(arrow_up.attr('class'), `dropdown-arrow ${down}`);
    // toggle arrow from down to up
    toggle_arrow(arrow_down);
    assert.strictEqual(arrow_down.attr('class'), `dropdown-arrow ${up}`);
});