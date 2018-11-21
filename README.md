# big-grid

`big-grid` is a table-rendering library that helps you create a grid with an infinite number of columns and rows. It only paints the cells that are in view, helping you keep your DOM light and efficient.

It is:
- <b>Fast</b> - Renders only what is required
- <b>Dependency Free</b> - Pure vanllia javascript
- <b>Customizable </b> - Supports custom rendering
- <b>Small </b> - less than 10KB

## Demo

Checkout a [demo](https://neelneelneel.github.io/big-grid/) here.

## Installation

Install this libray, using your favorite package manager:
```
npm install big-grid
```

Utilize `npm run prod` to generate a bundled version, or run `npm run dev` to regenerate the library.

There are three JS files thats are outputed:

- `node_modules/big-grid/dist/big-grid.umd.js` a UMD bundle (suitable to use as a `script` tag)
- `node_modules/big-grid/dist/big-grid.cjs.js` a CommonJS bundle (suitable to use as in Node)
- `node_modules/big-grid/dist/big-grid.esm.js` a ES module bundle  (suitable to use as an `import`)

There is one CSS files that is outputed:

- `node_modules/big-grid/dist/big-grid.css`(suitable to load as a `link` tag).

It is necessary to load the css in with your project, but certain styles (text-color, background-color, border-color, etc) can be modified or overwritten to fit your desired look and feel.



## Usage

To use the library, either `Import` the module or load it as a `script`.

You will need to create a new instance of the module and pass in a few parameters:

```

var table = new BigGrid({
    mount: '', //DOM element or queryselector string that tells us where to draw the table - required
    data: [[]], //Array of arrays containing the information that will be rendered - required
    rows:[{ // Array containing the row information
        height: // height of the row in px
    }], 
    columns:[{ // Array containing the column information
        width: // width of the column in px
    }], 
    renderer: function(rowId, columnId, value){ // Function that is called to allow custom painting of the cell
        {
            class: '', // custom class applied to this cell value
            style: {}, // custom style applied to this cell value. This may get overwritten by mandatory positioning styles
            title: '', // custom title applied to this cell value
            content: '' //custom HTML to render
        }
    },
    scroll: function(){} // Function that is called after the view is scrolled,
    resized: function(){} // Function that is called after the view is resized
})

```

<b>Note:</b> Only `mount` and `data` are required.

## Backlog
* [ ] New Features
    * [x] Keyboard Tab Navigation
    * [x] Scroll callback
    * [x] Resize callback
    * [ ] Highlight Cell Capability
    * [ ] Copy Data to Keyboard
    * [ ] Cell Custom Events
    * [ ] Header Custom Events
    * [ ] Header Highlight
    * [ ] Row Custom Events
    * [ ] Row Highlight    
* [ ] Tests


## License

MIT