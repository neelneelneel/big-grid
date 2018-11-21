(function () {
    'use strict';

    var data = [];

    for (var row = 0; row < 20000; row++) {
      var holder = [];

      for (var col = 0; col < 50; col++) {
        holder.push('row-' + row + ', col-' + col);
      }

      data.push(holder);
    }

    var table = new BigGrid({
      mount: document.querySelector('#table'),
      data: data,
      renderer: function renderer(rowIdx, columnIdx, value) {
        return {
          class: '',
          title: '',
          style: {},
          content: columnIdx % 4 === 0 ? "<input value=\"".concat(rowIdx, "\"></input>") : value
        };
      }
    });

}());
