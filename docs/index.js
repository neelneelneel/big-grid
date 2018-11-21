let data = [];
for (let row = 0; row < 20000; row++) {
    let holder = [];
    for (let col = 0; col < 50; col++) {
        holder.push('row-' + row + ', col-' + col)
    }
    data.push(holder);
}

let table = new BigGrid({
    mount: document.querySelector('#table'),
    data: data,
    renderer: (rowIdx, columnIdx, value) => {
        return {
            class: '',
            title: '',
            style: {},
            content: columnIdx % 4 === 0 ? `<input value="${rowIdx}"></input>` : value
        }
    }
})