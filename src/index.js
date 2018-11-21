'use strict';

import './index.scss';

const DEFAULTS = {
    BUCKET: 1,
    ROW: (rowIdx) => {
        return {
            name: rowIdx,
            height: 28
        }
    },
    COLUMN: (columnIdx) => {
        return {
            name: columnIdx,
            width: 144
        }
    }
}

let
    renderer = (rowIdx, columnIdx, value) => {
        return {
            class: '',
            style: {},
            title: '',
            content: value
        }
    },
    eles = {
        mount: undefined,
        main: undefined,
        virtual: undefined,
        counter: undefined,
        header: undefined
    },
    virtual = {
        data: [],
        columnCount: 0,
        rowCount: 0,
        width: 0,
        height: 0,
        rows: [],
        columns: []
    },
    view = {
        startRow: undefined,
        endRow: undefined,
        startColumn: undefined,
        endColumn: undefined
    },
    focus = {
        row: undefined,
        column: undefined
    },
    scroll = {
        callback: () => { },
        timer: undefined,
        previousScrollTop: 0,
        previousScrollLeft: 0
    },
    resize = {
        callback: () => { },
        timer: undefined
    }


export default function BigGrid(config) {
    // set the mount
    if (typeof config.mount === 'string') {
        eles.mount = document.querySelector(config.mount);
    } else if (config.mount instanceof Element) {
        eles.mount = config.mount
    }

    // we need a place to render...
    if (typeof eles.mount === 'undefined') {
        console.error('Mount needs to be defined') // eslint-disable-line no-console
        return;
    }

    // set the data
    // we need data to render...
    if (typeof config.data === 'undefined') {
        console.error('Data needs to be defined') // eslint-disable-line no-console
        return;
    }

    virtual.data = config.data;

    //create the rows based on the manually passed rows (or the data)
    virtual.height = 0;

    let rowIterator;
    if (typeof config.rows !== 'undefined' && Array.isArray(config.rows)) {
        virtual.rowCount = config.rows.length;
        rowIterator = (rowIdx) => {
            return config.rows[rowIdx]
        }
    } else {
        virtual.rowCount = virtual.data.length;
        rowIterator = DEFAULTS.ROW;
    }

    // create calculate the virtual height and capture the row object
    for (let rowIdx = 0; rowIdx < virtual.rowCount; rowIdx++) {
        const row = rowIterator(rowIdx);

        virtual.rows.push({
            ...row,
            top: virtual.height
        })

        virtual.height += row.height;
    }

    //create the columns based on the manually passed columns (or the data)
    virtual.width = 0;

    let columnIterator;
    if (typeof config.rows !== 'undefined' && Array.isArray(config.rows)) {
        virtual.rowCount = config.columns.length;
        columnIterator = (columnIdx) => {
            return config.columns[columnIdx]
        }
    } else {
        virtual.columnCount = virtual.data[0].length
        columnIterator = DEFAULTS.COLUMN;
    }

    // create calculate the virtual width and capture the column object
    for (let columnIdx = 0; columnIdx < virtual.columnCount; columnIdx++) {
        const column = columnIterator(columnIdx);

        virtual.columns.push({
            key: columnIdx,
            ...column,
            left: virtual.width
        })

        virtual.width += column.width;
    }

    // set the cell renderer
    if (typeof config.renderer === 'function') {
        renderer = config.renderer;
    }

    // set the extra options
    if (typeof config.scroll !== 'undefined') {
        if (typeof config.scroll.callback === 'function') {
            scroll.callback = config.scroll.callback
        }
    }

    if (typeof config.resize !== 'undefined') {
        if (typeof config.resize.callback === 'function') {
            resize.callback = config.resize.callback
        }
    }

    build();
    visualize();
    updateHeader();
    updateCounter();
    updateCell();

    return {
        destroy: destroy
    }
}

/**
 * @name build
 * @desc build the initial table object
 * @returns {void}
 */
function build() {
    // remove the previous grid or clear out previous elements
    while (eles.mount && eles.mount.firstChild) {
        eles.mount.removeChild(eles.mount.firstChild);
    }

    // create the table element
    let tableEle = document.createElement('div');
    tableEle.className = 'big-grid';
    tableEle.innerHTML =
        `<div class="big-grid">
            <div class="big-grid__corner"></div>
            <div class="big-grid__header">
                <div class="big-grid__header__virtual">
                </div>
            </div>
            <div class="big-grid__counter">
                <div class="big-grid__counter__virtual">
                </div>
            </div>
            <div class="big-grid__main">
                <div class="big-grid__main__virtual">
                </div>
            </div>
         </div>`

    // store the required fields
    eles.main = tableEle.querySelector('.big-grid__main');
    eles.virtual = tableEle.querySelector('.big-grid__main__virtual');
    eles.counter = tableEle.querySelector('.big-grid__counter__virtual');
    eles.header = tableEle.querySelector('.big-grid__header__virtual');

    // set the initial height
    eles.virtual.style.height = virtual.height + 'px';
    eles.virtual.style.width = virtual.width + 'px';
    eles.counter.style.height = virtual.height + 'px';
    eles.header.style.width = virtual.width + 'px';

    // mount the table
    eles.mount.appendChild(tableEle.firstElementChild);

    // add the events
    window.addEventListener('resize', onResize);
    eles.main.addEventListener('scroll', onScroll);
    eles.main.addEventListener('click', onClick);
}

/**
 * @name visualize
 * @desc render the table based on the view
 * @returns {void}
 */
function visualize() {
    //based on the position of the view, figure out which items to render
    const startHeight = eles.main.scrollTop;

    view.startRow = 0;
    for (; view.startRow < virtual.rowCount; view.startRow++) {
        if (startHeight < (virtual.rows[view.startRow].top + virtual.rows[view.startRow].height)) {
            view.startRow -= DEFAULTS.BUCKET; // we render one less, because things may look funky
            break;
        }
    }

    if (view.startRow < 0) {
        view.startRow = 0;
    }

    const stopHeight = startHeight + eles.main.offsetHeight;

    view.endRow = view.startRow;
    for (; view.endRow < virtual.rowCount; view.endRow++) {
        if (stopHeight < (virtual.rows[view.endRow].top + virtual.rows[view.endRow].height)) {
            view.endRow += DEFAULTS.BUCKET; // we render one more, because things may look funky
            break;
        }
    }

    if (virtual.rowCount - 1 < view.endRow) {
        view.endRow = virtual.rowCount - 1;
    }

    const startWidth = eles.main.scrollLeft;

    view.startColumn = 0;
    for (; view.startColumn < virtual.columnCount; view.startColumn++) {
        if (startWidth < (virtual.columns[view.startColumn].left + virtual.columns[view.startColumn].width)) {
            view.startColumn -= DEFAULTS.BUCKET; // we render one less, because things may look funky
            break;
        }
    }

    if (view.startColumn < 0) {
        view.startColumn = 0;
    }

    const stopWidth = startWidth + eles.main.offsetWidth;

    view.endColumn = view.startColumn;
    for (; view.endColumn < virtual.columnCount; view.endColumn++) {
        if (stopWidth < (virtual.columns[view.endColumn].left + virtual.columns[view.endColumn].width)) {
            view.endColumn += DEFAULTS.BUCKET; // we render one more, because things may look funky
            break;
        }
    }

    if (virtual.columnCount - 1 < view.endColumn) {
        view.endColumn = virtual.columnCount - 1;
    }
}

/**
 * @name updateHeader
 * @desc update the meta positions
 * @returns {void}
 */
function updateHeader() {
    // remove the header from the view
    let headerParentEle = eles.header.parentNode;

    headerParentEle.removeChild(eles.header);

    // update the header
    eles.header.style.left = -1 * eles.main.scrollLeft + 'px';

    //update the view
    let headerEle = eles.header.firstElementChild;

    for (let columnIdx = view.startColumn; columnIdx <= view.endColumn; columnIdx++) {
        // there is a child, we will use that element, if there isn't we need to create one
        if (!headerEle) {
            headerEle = document.createElement('div');
        }

        headerEle.className = 'big-grid__cell big-grid__cell--header '
        headerEle.style.cssText = toCSSString({
            'position': 'absolute',
            'left': virtual.columns[columnIdx].left + 'px',
            'width': virtual.columns[columnIdx].width + 'px',
        });
        headerEle.title = virtual.columns[columnIdx].name;
        headerEle.innerText = virtual.columns[columnIdx].name;

        if (!headerEle.parentNode) {
            eles.header.appendChild(headerEle);
        }

        headerEle = headerEle.nextElementSibling;
    }

    // clean up
    removeSiblings(headerEle);

    // add the element back
    headerParentEle.appendChild(eles.header);
}

/**
 * @name updateCounter
 * @desc update the counter positions
 * @returns {void}
 */
function updateCounter() {
    // remove the header from the view
    let counterParentEle = eles.counter.parentNode;
    counterParentEle.removeChild(eles.counter);

    // update the counter
    eles.counter.style.top = -1 * eles.main.scrollTop + 'px';

    //update the view
    let counterEle = eles.counter.firstElementChild;

    for (let rowIdx = view.startRow; rowIdx <= view.endRow; rowIdx++) {
        // there is a child, we will use that element, if there isn't we need to create one
        if (!counterEle) {
            counterEle = document.createElement('div');
        }

        counterEle.className = 'big-grid__cell big-grid__cell--counter ' + (rowIdx % 2 === 0 ? 'big-grid__cell--even ' : 'big-grid__cell--odd ')
        counterEle.style.cssText = toCSSString({
            'position': 'absolute',
            'top': virtual.rows[rowIdx].top + 'px',
            'height': virtual.rows[rowIdx].height + 'px',
            'padding': '4px',
            'line-height': virtual.rows[rowIdx].height - 8 + 'px'
        });
        counterEle.title = virtual.rows[rowIdx].name;
        counterEle.innerText = virtual.rows[rowIdx].name;

        if (!counterEle.parentNode) {
            eles.counter.appendChild(counterEle);
        }

        counterEle = counterEle.nextElementSibling;
    }

    // clean up
    removeSiblings(counterEle);

    // add the element back
    counterParentEle.appendChild(eles.counter);
}

/**
 * @name updateCell
 * @desc update the cell positions
 * @returns {void}
 */
function updateCell() {
    // remove the cell from the view
    let virtualParentEle = eles.virtual.parentNode;
    virtualParentEle.removeChild(eles.virtual);

    //update the view
    let cellEle = eles.virtual.firstElementChild,
        focusCellEle

    for (let rowIdx = view.startRow; rowIdx <= view.endRow; rowIdx++) {
        for (let columnIdx = view.startColumn; columnIdx <= view.endColumn; columnIdx++) {
            const cell = renderer(rowIdx, columnIdx, virtual.data[rowIdx][virtual.columns[columnIdx].key]);

            // there is a child, we will use that element, if there isn't we need to create one
            if (!cellEle) {
                cellEle = document.createElement('div');
                cellEle.tabIndex = 0;
                cellEle.addEventListener('keydown', onCellKeydown);
            }

            cellEle.setAttribute('cell', generateCellID(rowIdx, columnIdx))
            cellEle.className = 'big-grid__cell '
                + (rowIdx % 2 === 0 ? 'big-grid__cell--even ' : 'big-grid__cell--odd ')
                + cell.class

            cellEle.style.cssText = toCSSString({
                ...cell.style,
                'position': 'absolute',
                'top': virtual.rows[rowIdx].top + 'px',
                'left': virtual.columns[columnIdx].left + 'px',
                'height': virtual.rows[rowIdx].height + 'px',
                'width': virtual.columns[columnIdx].width + 'px',
                'padding': '4px',
                'line-height': virtual.rows[rowIdx].height - 8 + 'px'
            });
            cellEle.title = cell.title;
            cellEle.innerHTML = cell.content;

            if (!cellEle.parentNode) {
                eles.virtual.appendChild(cellEle);
            }

            if (rowIdx === focus.row && columnIdx === focus.column) {
                focusCellEle = cellEle;
            }

            cellEle = cellEle.nextElementSibling;
        }
    }

    // clean up
    removeSiblings(cellEle);

    // add the element back
    virtualParentEle.appendChild(eles.virtual);

    //focus on the cell element
    if (focusCellEle) {
        focusCellEle.focus({
            preventScroll: true
        });
    }
}

/**
 * @name onResize
 * @desc called when resized
 * @returns {void}
 */
function onResize() {
    visualize();
    updateHeader()
    updateCounter()

    if (resize.timer) {
        stopDelay(resize.timer);
        resize.timer = null;
    }

    resize.timer = startDelay(() => {
        updateCell();
        resize.callback();
        resize.timer = null;
    });
}

/**
 * @name onScroll
 * @desc called when scrolling
 * @returns {void}
 */
function onScroll() {
    visualize();

    if (scroll.previousScrollLeft !== eles.main.scrollLeft) {
        updateHeader()
    }

    if (scroll.previousScrollTop !== eles.main.scrollTop) {
        updateCounter()
    }

    if (scroll.timer) {
        stopDelay(scroll.timer);
        scroll.timer = null;
    }

    scroll.timer = startDelay(() => {
        updateCell();
        scroll.callback();
        scroll.timer = null;
    });

    scroll.previousScrollTop = eles.main.scrollTop
    scroll.previousScrollLeft = eles.main.scrollLeft
}

/**
 * @name onClick
 * @desc called when the main element is clicked
 * @param {DOMEvent} event - click event
 * @returns {void}
 */
function onClick() {
    let target = event.target || event.srcElement;

    if (!target) {
        return;
    }

    // try on the current
    let cellId = parseCellID(target.getAttribute('cell'));
    while (target && cellId.length === 0) {
        target = target.parentNode;
        if (target) {
            cellId = parseCellID(target.getAttribute('cell'));
        }
    }

    if (cellId[0] !== focus.row || cellId[1] !== focus.column) {
        focus.row = cellId[0];
        focus.column = cellId[1];
    }
}

/**
 * @name onCellKeydown
 * @desc called when a key is pressed down on the cell element
 * @param {DOMEvent} event - keydown event
 * @returns {void}
 */
function onCellKeydown(event) {
    let target = event.target || event.srcElement;

    // check the target
    if (!target) {
        return;
    }

    // if it isn't the correct cell, we skip it unless it is a tab (tab cycles focus)
    let cellId = parseCellID(target.getAttribute('cell'));
    if (cellId[0] !== focus.row || cellId[1] !== focus.column) {
        if (event.keyCode !== 9) {
            return;
        }
    }

    //focus on the child, if we select other keys. This should pass the value down.
    if (
        event.keyCode !== 37 &&
        event.keyCode !== 38 &&
        event.keyCode !== 39 &&
        event.keyCode !== 40 &&
        event.keyCode !== 9 &&
        event.keyCode !== 33 &&
        event.keyCode !== 34
    ) {
        if (event.keyCode === 32) {
            event.preventDefault(); //block the scroll
        }

        if (target) {
            let child = target.firstElementChild;
            if (child) {
                child.focus({
                    preventScroll: true
                });
            }
        }

        return;
    }

    // logic to shift the focus
    let newFocusRow = focus.row,
        newFocusColumn = focus.column;

    event.preventDefault(); //block the scroll or tab defaults

    if (event.ctrlKey) { // ctrl
        //up
        if (event.keyCode === 38) {
            newFocusRow = 0
        }
        //right
        else if (event.keyCode === 39) {
            newFocusColumn = virtual.columnCount - 1;
        }
        //bottom
        else if (event.keyCode === 40) {
            newFocusRow = virtual.rowCount - 1;
        }
        //left
        else if (event.keyCode === 37) {
            newFocusColumn = 0;
        }
    } else if (event.shiftKey) { //shift
        //up
        if (event.keyCode === 38) {
            console.warn('TODO: Shift')
        }
        //right
        else if (event.keyCode === 39) {
            console.warn('TODO: Shift')
        }
        //bottom
        else if (event.keyCode === 40) {
            console.warn('TODO: Shift')
        }
        //left
        else if (event.keyCode === 37) {
            console.warn('TODO: Shift')
        }
        // tab
        else if (event.keyCode === 9) {
            newFocusColumn--;
        }
    } else { //normal
        //up
        if (event.keyCode === 38) {
            newFocusRow--;
        }
        //right
        else if (event.keyCode === 39) {
            newFocusColumn++;
        }
        //bottom
        else if (event.keyCode === 40) {
            newFocusRow++;
        }
        //left
        else if (event.keyCode === 37) {
            newFocusColumn--;
        }
        // tab
        else if (event.keyCode === 9) {
            newFocusColumn++;
        }
        //page up
        else if (event.keyCode === 33) {
            newFocusRow -= (view.endRow - view.startRow - 2 * DEFAULTS.BUCKET); //because of the extra rendering
        }
        //page down
        else if (event.keyCode === 34) {
            newFocusRow += (view.endRow - view.startRow - 2 * DEFAULTS.BUCKET); //because of the extra rendering
        }
    }

    // check the data bounds
    if (newFocusRow < 0) {
        newFocusRow = 0;
    }

    if (virtual.rowCount - 1 < newFocusRow) {
        newFocusRow = virtual.rowCount - 1;
    }

    if (newFocusColumn < 0) {
        newFocusColumn = 0;
    }

    if (virtual.columnCount - 1 < newFocusColumn) {
        newFocusColumn = virtual.columnCount - 1;
    }

    // update the focus
    if (newFocusRow !== focus.row || newFocusColumn !== focus.column) {
        let visible = false;

        //focus the elemeent if it is in the view
        if (
            view.startRow <= newFocusRow &&
            newFocusRow <= view.endRow &&
            view.startColumn <= newFocusColumn &&
            newFocusColumn <= view.endColumn
        ) {
            let cellEle = eles.virtual.firstElementChild,
                found = false;

            while (cellEle && !found) {
                const cellId = parseCellID(cellEle.getAttribute('cell'));
                if (cellId[0] === newFocusRow && cellId[1] === newFocusColumn) {

                    const boundRect = eles.main.getBoundingClientRect();
                    const cellRect = cellEle.getBoundingClientRect();

                    if (
                        cellRect.top >= boundRect.top &&
                        cellRect.left >= boundRect.left &&
                        cellRect.bottom <= (boundRect.bottom - (boundRect.height - eles.main.clientHeight)) &&
                        cellRect.right <= (boundRect.right - (boundRect.width - eles.main.clientWidth))
                    ) {
                        visible = true;

                        //prevent the scroll and focus on it
                        cellEle.focus({
                            preventScroll: true
                        });
                    }

                    found = true;
                }

                cellEle = cellEle.nextElementSibling
            }
        }


        // shift based on the old position
        if (!visible) {
            if (newFocusRow !== focus.row) {
                eles.main.scrollTop += (virtual.rows[newFocusRow].top - virtual.rows[focus.row].top);
            }

            if (newFocusColumn !== focus.column) {
                eles.main.scrollLeft += (virtual.columns[newFocusColumn].left - virtual.columns[focus.column].left);
            }
        }

        // set it
        focus.row = newFocusRow;
        focus.column = newFocusColumn;
    }
}

/**
 * @name destroy
 * @desc destroy the table
 * @returns {void}
 */
function destroy() {
    // remove the previous grid or clear out previous elements
    while (eles.mount && eles.mount.firstChild) {
        eles.mount.removeChild(eles.mount.firstChild);
    }

    // remove the liseteners
    window.removeEventListener('resize', onResize)
}


/** Helpers */
/**
 * @name startDelay
 * @desc start a delay (paint when necessary)
 * @param {function} callback - callback to call
 * @returns {timer}
 */
function startDelay(callback) {
    if (window.requestAnimationFrame) {
        return window.requestAnimationFrame(callback)
    }

    return window.setTimeout(callback, 0)
}

/**
 * @name stopDelay
 * @desc stop a delay (paint when necessary)
 * @param {timer} timer - timer to cancel
 * @returns {timer}
 */
function stopDelay(timer) {
    if (window.cancelAnimationFrame) {
        return window.cancelAnimationFrame(timer)
    }
    return window.clearTimeout(timer)
}

/**
 * @name removeSiblings
 * @desc remove the current node and its siblings
 * @param {DOMElement} deadChild - dead node to start from
 * @returns {void}
 */
function removeSiblings(deadChild) {
    while (deadChild && deadChild.nextElementSibling) {
        deadChild.parentNode.removeChild(deadChild.nextElementSibling)
    }

    if (deadChild) {
        deadChild.parentNode.removeChild(deadChild)
    }
}

/**
 * @name toCSSString
 * @desc convert a CSS styleObj to a string
 * @param {object} styleObj - style object
 * @returns {void}
 */
function toCSSString(styleObj) {
    return Object.entries(styleObj).reduce((styleString, [propName, propValue]) => {
        return `${styleString}${propName}:${propValue};`;
    }, '')
}

/**
 * @name generateCellID
 * @desc generate an ID for the cell
 * @param {number} rowIdx - row index
 * @param {number} columnIdx - column index
 * @returns {string} id of the cell
 */
function generateCellID(rowIdx, columnIdx) {
    return `${rowIdx}-${columnIdx}`;
}

/**
 * @name parseCellID
 * @desc parse the ID for the cell information
 * @param {string} id - row index
 * @returns {array} array containing [rowIdx, columnIdx]
 */
function parseCellID(id) {
    if (!id) {
        return [];
    }

    let split = id.split("-");

    if (split.length !== 2) {
        return [];
    }

    return [
        +split[0],
        +split[1]
    ];
}