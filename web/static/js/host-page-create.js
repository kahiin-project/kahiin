const drawer_questions = document.querySelectorAll('.drawer-question');
const dropbox = document.getElementById('dropbox');

let questions_id = [0, 1, 2];
let draggedIndex = null;
let draggedQuestion = null;

function updateQuestionOrder() {
    dropbox.innerHTML = ''; // Clear previous elements
    questions_id.forEach((question_id, index) => {
        
        const droppable_space = document.createElement('div');
        droppable_space.classList.add('droppable-space');
        droppable_space.setAttribute('line-pos', index);
        dropbox.appendChild(droppable_space);

        droppable_space.addEventListener('dragover', (e) => {
            e.preventDefault();
            droppable_space.classList.add('dragover');
            console.log('Drag over');
        });
        droppable_space.addEventListener('dragleave', (e) => {
            droppable_space.classList.remove('dragover');
            console.log('Drag leave');
        });

        droppable_space.addEventListener('drop', (e) => {
            e.preventDefault();
            let targetIndex = parseInt(droppable_space.getAttribute('line-pos'));
            if (draggedQuestion !== null) {
                // Copy the dragged question to the target index
                questions_id.splice(targetIndex, 0, parseInt(draggedQuestion));
                draggedQuestion = null; // Reset draggedQuestion after copying
                console.log('Updated questions_id:', questions_id);
                updateQuestionOrder(); // Refresh the order
            } else if (draggedIndex !== null) {
                // Move the dragged question to the target index
                if(targetIndex > draggedIndex) targetIndex--;
                questions_id.splice(targetIndex, 0, questions_id.splice(draggedIndex, 1)[0]);
                draggedIndex = null; // Reset draggedIndex after moving
                console.log('Updated questions_id:', questions_id);
                updateQuestionOrder(); // Refresh the order
            }
        });

        const question_div = document.createElement('div');
        question_div.innerHTML = question_id;
        question_div.classList.add('question');
        question_div.draggable = true;
        question_div.setAttribute('line-pos', index);

        question_div.addEventListener('dragstart', (e) => {
            draggedIndex = index;
            e.dataTransfer.setData('text/plain', '');
            console.log('Drag start:', draggedIndex);
        });

        dropbox.appendChild(question_div);
    });
}

drawer_questions.forEach(drawer_question => {
    drawer_question.addEventListener('dragstart', (e) => {
        draggedQuestion = drawer_question.getAttribute('question-id');
        e.dataTransfer.setData('text/plain', '');
        console.log('Drag start from drawer:', draggedQuestion);
    });
});

updateQuestionOrder();