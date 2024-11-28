const itemContainer = document.getElementById('questions_list')
const draggableItems = document.querySelectorAll('.draggable-item');

draggableItems.forEach(item => {
    item.addEventListener('dragstart', dragStart);
});
  
itemContainer.addEventListener('dragover', dragOver);
itemContainer.addEventListener('drop', drop);

function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.textContent);
    e.dataTransfer.effectAllowed = 'copy';
}

function dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

function drop(e) {
    e.preventDefault();
    const draggedItemText = e.dataTransfer.getData('text/plain');
    const newItem = document.createElement('div');
    newItem.classList.add('draggable-item');
    newItem.textContent = draggedItemText;
    newItem.setAttribute('draggable', 'true');
    newItem.addEventListener('dragstart', dragStart);
    itemContainer.appendChild(newItem);
    updateItemOrder();
}

function updateItemOrder() {
    const items = Array.from(itemContainer.children);
    items.forEach((item, index) => {
        item.style.order = index;
    });
}