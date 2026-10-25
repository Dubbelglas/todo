(() => {
    const {
        state,
        normalizePriority,
        saveTasks,
        escapeHtml,
        getCategories,
        createTask,
    } = window.TodoData;

    const form = document.querySelector('#todo-form');
    const nameInput = document.querySelector('#todo-name');
    const categorySelect = document.querySelector('#todo-category');
    const newCategoryWrap = document.querySelector('#todo-new-category-wrap');
    const newCategoryInput = document.querySelector('#todo-new-category');
    const priorityInput = document.querySelector('#todo-priority');
    const descriptionInput = document.querySelector('#todo-description');
    const deadlineInput = document.querySelector('#todo-deadline');
    const periodicInput = document.querySelector('#todo-periodic');
    const list = document.querySelector('#todo-list');
    const periodicList = document.querySelector('#periodic-todo-list');
    const tasksPane = document.querySelector('.tasks-pane');
    const periodicPane = document.querySelector('.periodic-pane');
    const taskCount = document.querySelector('#task-count');
    const periodicTaskCount = document.querySelector('#periodic-task-count');
    const clearCompletedButton = document.querySelector('#clear-completed');
    const deleteConfirmDialog = document.querySelector('#delete-confirm-dialog');
    const deleteConfirmMessage = document.querySelector('#delete-confirm-message');
    const cancelDeleteButton = document.querySelector('#cancel-delete');
    const confirmDeleteButton = document.querySelector('#confirm-delete');
    const completeVisibleButton = document.querySelector('#complete-visible');
    const importButton = document.querySelector('#import-tasks');
    const importInput = document.querySelector('#import-file');
    const exportButton = document.querySelector('#export-tasks');
    const sortSelect = document.querySelector('#sort-tasks');
    const openCategoryFilterButton = document.querySelector('#open-category-filter');
    const categoryFilterControl = document.querySelector('.category-filter-control');
    const categoryFilterMenu = document.querySelector('#category-filter-menu');
    const toolbar = document.querySelector('.toolbar');
    const taskDialog = document.querySelector('#task-dialog');
    const renameCategoryButton = document.querySelector('#rename-category');
    const renameCategoryDialog = document.querySelector('#rename-category-dialog');
    const renameCategoryForm = document.querySelector('#rename-category-form');
    const renameCategorySelect = document.querySelector('#rename-category-select');
    const renameCategoryName = document.querySelector('#rename-category-name');
    const dialogTitle = document.querySelector('#task-dialog-title');
    const submitTaskButton = document.querySelector('#submit-task');
    const confirmationBanner = document.querySelector('#confirmation-banner');
    const confirmationHome = confirmationBanner.parentElement;
    let categoryValidationAttempted = false;
    let confirmationTimer = null;
    let taskDialogHistoryToken = null;

    function showConfirmation(message, undoAction = null) {
        const openDialogs = [...document.querySelectorAll('dialog[open]')];
        const activeDialog = openDialogs.at(-1);
        if (activeDialog && !activeDialog.contains(confirmationBanner)) {
            activeDialog.append(confirmationBanner);
        } else if (!activeDialog && confirmationBanner.parentElement !== confirmationHome) {
            confirmationHome.append(confirmationBanner);
        }
        confirmationBanner.replaceChildren();
        if (undoAction) {
            const messageElement = document.createElement('span');
            messageElement.textContent = message;
            const undoButton = document.createElement('button');
            undoButton.type = 'button';
            undoButton.className = 'confirmation-undo';
            undoButton.textContent = 'Undo';
            undoButton.addEventListener('click', () => {
                dismissConfirmation();
                undoAction();
            }, { once: true });
            confirmationBanner.append(messageElement, undoButton);
        } else {
            confirmationBanner.textContent = message;
        }
        confirmationBanner.hidden = false;
        if (typeof confirmationBanner.showPopover === 'function') {
            if (!confirmationBanner.matches(':popover-open')) confirmationBanner.showPopover();
        }
        window.clearTimeout(confirmationTimer);
        confirmationTimer = window.setTimeout(() => {
            dismissConfirmation();
        }, undoAction ? 5000 : 3000);
    }

    function dismissConfirmation() {
        window.clearTimeout(confirmationTimer);
        if (typeof confirmationBanner.hidePopover === 'function' && confirmationBanner.matches(':popover-open')) {
            confirmationBanner.hidePopover();
        }
        confirmationBanner.hidden = true;
        if (confirmationBanner.parentElement !== confirmationHome) {
            confirmationHome.append(confirmationBanner);
        }
    }

    function updateCategoryValidation() {
        const categoryNeedsName = categorySelect.value === '__new__';
        const categoryIsMissing = !categorySelect.value;
        const newCategoryIsMissing = categoryNeedsName && !newCategoryInput.value.trim();
        const invalid = categoryValidationAttempted && (categoryIsMissing || newCategoryIsMissing);

        categorySelect.classList.toggle('category-invalid', invalid);
        newCategoryInput.classList.toggle('category-invalid', invalid);
        if (!categoryIsMissing && !newCategoryIsMissing) {
            categoryValidationAttempted = false;
        }
    }

    function openTaskDialog(task = null) {
        state.editingId = task?.id || null;
        categoryValidationAttempted = false;
        dialogTitle.textContent = task ? 'Edit task' : 'Add task';
        submitTaskButton.textContent = task ? 'Save changes' : 'Add task';
        document.querySelector('#submit-task-top').textContent = submitTaskButton.textContent;
        form.reset();
        nameInput.classList.remove('name-invalid');
        priorityInput.value = task?.priority || 'medium';
        nameInput.value = task?.name || '';
        descriptionInput.value = task?.description || '';
        deadlineInput.value = task?.deadline || '';
        periodicInput.checked = task?.periodic || false;
        refreshCategoryOptions(task?.category || '');
        if (task && !getCategories().includes(task.category)) {
            categorySelect.value = '__new__';
            newCategoryInput.value = task.category;
        }
        updateNewCategoryVisibility();
        if (typeof taskDialog.showModal === 'function') {
            taskDialogHistoryToken = `task-dialog-${Date.now()}-${Math.random()}`;
            window.history.pushState({ ...window.history.state, taskDialogToken: taskDialogHistoryToken }, '');
            taskDialog.showModal();
        } else {
            taskDialog.setAttribute('open', '');
        }
        nameInput.focus();
    }

    function closeTaskDialog() {
        if (typeof taskDialog.close === 'function') {
            taskDialog.close();
        } else {
            taskDialog.removeAttribute('open');
        }
        state.editingId = null;
        categoryValidationAttempted = false;
        form.reset();
        priorityInput.value = 'medium';
        refreshCategoryOptions();
    }

    taskDialog.addEventListener('close', () => {
        if (taskDialogHistoryToken && window.history.state?.taskDialogToken === taskDialogHistoryToken) {
            window.history.back();
        }
        taskDialogHistoryToken = null;
    });

    window.addEventListener('popstate', () => {
        if (taskDialog.open) closeTaskDialog();
    });

    function refreshCategoryOptions(selectedValue = '') {
        const categories = getCategories();
        renameCategoryButton.disabled = categories.length === 0;
        const selected = categories.includes(selectedValue) ? selectedValue : '';

        categorySelect.innerHTML = [
            '<option value="__new__">Add new category...</option>',
            ...categories.map((category) => `<option value="${escapeHtml(category)}" ${category === selected ? 'selected' : ''}>${escapeHtml(category)}</option>`),
        ].join('');

        if (selected) {
            categorySelect.value = selected;
        } else if (categories.length) {
            categorySelect.value = categories[0];
        } else {
            categorySelect.value = '__new__';
        }

        updateNewCategoryVisibility();
    }

    function openRenameCategoryDialog() {
        const categories = getCategories();
        if (!categories.length) return;

        renameCategorySelect.innerHTML = categories.map((category) =>
            `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
        const selectedCategory = categorySelect.value !== '__new__' ? categorySelect.value : state.categoryFilter;
        renameCategorySelect.value = categories.includes(selectedCategory) ? selectedCategory : categories[0];
        renameCategoryName.value = '';
        renameCategoryName.setCustomValidity('');
        renameCategoryName.classList.remove('category-invalid');
        if (typeof renameCategoryDialog.showModal === 'function') {
            renameCategoryDialog.showModal();
        } else {
            renameCategoryDialog.setAttribute('open', '');
        }
        renameCategoryName.focus();
    }

    function closeRenameCategoryDialog() {
        if (typeof renameCategoryDialog.close === 'function') {
            renameCategoryDialog.close();
        } else {
            renameCategoryDialog.removeAttribute('open');
        }
    }

    function refreshCategoryFilterOptions() {
        const categories = getCategories();
        if (!categories.includes(state.categoryFilter)) {
            state.categoryFilter = '';
        }

        const options = [['', 'All categories'], ...categories.map((category) => [category, category])];
        categoryFilterMenu.innerHTML = options.map(([value, label]) => `
        <button type="button" class="category-filter-option" role="option" data-category="${escapeHtml(value)}"
            aria-selected="${state.categoryFilter === value}">${escapeHtml(label)}</button>
    `).join('');
        openCategoryFilterButton.classList.toggle('has-category-filter', Boolean(state.categoryFilter));
        openCategoryFilterButton.setAttribute('aria-label', state.categoryFilter
            ? `Category filter: ${state.categoryFilter}`
            : 'Choose task category');
        openCategoryFilterButton.title = openCategoryFilterButton.getAttribute('aria-label');
    }

    document.addEventListener('click', async (event) => {
        const emailButton = event.target instanceof Element ? event.target.closest('.email-link') : null;
        if (!emailButton) return;

        event.preventDefault();
        event.stopPropagation();

        try {
            await navigator.clipboard.writeText(emailButton.dataset.email);
            showConfirmation('Email address copied');
        } catch (error) {
            showConfirmation('Unable to copy email address');
        }
    }, true);

    function updateNewCategoryVisibility() {
        const showNewCategory = categorySelect.value === '__new__';
        newCategoryWrap.classList.toggle('hidden', !showNewCategory);
        newCategoryInput.required = showNewCategory;
        renameCategoryButton.disabled = showNewCategory || getCategories().length === 0;
    }

    categorySelect.addEventListener('change', updateNewCategoryVisibility);

    function getDisplayedTasks() {
        return window.TodoRenderer.getDisplayedTasks(window.TodoApp);
    }

    function render() {
        window.TodoRenderer.render(window.TodoApp);
    }
    function attemptCategoryValidation() {
        categoryValidationAttempted = true;
        updateCategoryValidation();
    }

    window.TodoApp = {
        state,
        normalizePriority,
        createTask,
        saveTasks,
        getCategories,
        getDisplayedTasks,
        render,
        refreshCategoryOptions,
        refreshCategoryFilterOptions,
        showConfirmation,
        updateCategoryValidation,
        attemptCategoryValidation,
        updateNewCategoryVisibility,
        openTaskDialog,
        closeTaskDialog,
        openRenameCategoryDialog,
        closeRenameCategoryDialog,
        elements: {
            form,
            nameInput,
            categorySelect,
            newCategoryInput,
            priorityInput,
            descriptionInput,
            deadlineInput,
            periodicInput,
            list,
            periodicList,
            taskCount,
            periodicTaskCount,
            tasksPane,
            periodicPane,
            clearCompletedButton,
            deleteConfirmDialog,
            deleteConfirmMessage,
            cancelDeleteButton,
            confirmDeleteButton,
            completeVisibleButton,
            importButton,
            importInput,
            exportButton,
            sortSelect,
            openCategoryFilterButton,
            categoryFilterControl,
            categoryFilterMenu,
            toolbar,
            taskDialog,
            renameCategoryButton,
            renameCategoryForm,
            renameCategorySelect,
            renameCategoryName,
        },
    };

    refreshCategoryOptions();
    render();

    window.setTimeout(() => {
        const loadingScreen = document.querySelector('#loading-screen');
        const warningDialog = document.querySelector('#first-run-warning');
        const facts = [
            'Octopuses have three hearts.',
            'A day on Venus is longer than its year.',
            'Honey can stay edible for thousands of years when sealed.',
            'Bananas are berries, but strawberries are not.',
            'Some turtles can breathe through their bottoms.'
        ];
        const jokes = [
            'Why did the scarecrow win an award? Because he was outstanding in his field.',
            'I only know 25 letters of the alphabet. I don’t know y.',
            'Why did the bicycle fall over? It was two-tired.',
            'What do you call cheese that isn’t yours? Nacho cheese.',
            'I used to hate facial hair, but then it grew on me.'
        ];
        let loadingFinished = false;
        let warningVisible = false;

        const finishLoading = () => {
            if (loadingFinished) return;
            loadingFinished = true;
            loadingScreen.remove();
            if (warningVisible) document.querySelector('#dismiss-first-run-warning').focus();
        };

        let warningSeen = false;
        try {
            warningSeen = localStorage.getItem('todo-manager-welcome-warning-seen') === 'true';
        } catch (error) {
            console.error('Unable to check whether the welcome warning was seen:', error);
        }

        if (!warningSeen) {
            document.querySelector('#welcome-fact').textContent = facts[Math.floor(Math.random() * facts.length)];
            document.querySelector('#welcome-joke').textContent = jokes[Math.floor(Math.random() * jokes.length)];
            warningDialog.hidden = false;
            document.querySelector('.app-shell').inert = true;
            warningVisible = true;
        }

        const beginLoadingFade = () => {
            loadingScreen.classList.add('is-hidden');
            loadingScreen.addEventListener('transitionend', (event) => {
                if (event.target === loadingScreen && event.propertyName === 'opacity') finishLoading();
            }, { once: true });
            window.setTimeout(finishLoading, 600);
        };

        Promise.resolve(window.pwaUpdateReady).then(beginLoadingFade);

        document.querySelector('#dismiss-first-run-warning').addEventListener('click', () => {
            try {
                localStorage.setItem('todo-manager-welcome-warning-seen', 'true');
            } catch (error) {
                console.error('Unable to remember that the welcome warning was seen:', error);
            }
            warningDialog.hidden = true;
            document.querySelector('.app-shell').inert = false;
            document.querySelector('#add-task').focus();
        });
    }, 200);  // Time the loading screen is shown before fading out, in milliseconds

})();

