const drawer_questions = document.querySelectorAll('.drawer-question');
const dropbox = document.getElementById('dropbox');

function createDroppableSpace(index) {
    const droppable_space = document.createElement('div');
    droppable_space.classList.add('droppable-space');
    droppable_space.setAttribute('line-pos', index);
    dropbox.appendChild(droppable_space);

    droppable_space.addEventListener('dragover', (e) => {
        e.preventDefault();
        droppable_space.classList.add('dragover');
    });

    droppable_space.addEventListener('dragleave', (e) => {
        droppable_space.classList.remove('dragover');
    });

    droppable_space.addEventListener('drop', (e) => {
        e.preventDefault();
        let targetIndex = parseInt(droppable_space.getAttribute('line-pos'));
        if (draggedQuestion !== null) {
            // Copy the dragged question to the target index
            questionToCopy = drawer[draggedQuestion];

            socket.emit('copyQuestion', {
                question: questionToCopy, 
                to: targetIndex, 
                quiz_name: document.getElementById("edit_quiz_name").value, 
                passcode: passcode
            });

            draggedQuestion = null; // Reset draggedQuestion after copying
        } else if (draggedIndex !== null) {
            // Move the dragged question to the target index
            if(targetIndex > draggedIndex) targetIndex--;
            
            socket.emit('moveQuestion', {
                from: draggedIndex, 
                to: targetIndex, 
                quiz_name: document.getElementById("edit_quiz_name").value, 
                passcode: passcode
            });

            draggedIndex = null; // Reset draggedIndex after moving
        }
    });
}