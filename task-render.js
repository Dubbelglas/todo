(() => {
    const { escapeHtml, formatDate, getVisibleTasks, getVisiblePeriodicTasks, saveSortMode } = window.TodoData;
    const { renderDescription } = window.TodoFormatting;

    function getDeadlineColorClass(deadline) {
        const [year, month, day] = deadline.split('-').map(Number);
        const dueDate = Date.UTC(year, month - 1, day);
        const now = new Date();
        const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        const daysUntil = Math.round((dueDate - today) / 86400000);
        if (daysUntil < 0) return 'date-overdue';
        if (daysUntil < 1) return 'date-tomorrow';
        if (daysUntil <= 7) return 'date-soon';
        return 'date-far-away';
    }

    function getDisplayedTasks(app) {
        const { state, elements } = app;
        return [
            ...(elements.tasksPane.open ? getVisibleTasks() : []),
            ...(elements.periodicPane.open ? getVisiblePeriodicTasks() : []),
        ];
    }

    function renderTaskView(task, state) {
        return `
        <div class="task-card">
            <div class="task-main-row">
                <div class="todo-main">
                    <input type="checkbox" data-action="toggle" data-id="${task.id}" aria-label="Mark ${escapeHtml(task.name)} complete" ${task.completed ? 'checked' : ''} />
                    ${task.description
                ? `<button type="button" class="todo-text task-name-text task-name-toggle" data-action="toggle-details" aria-controls="task-details-${escapeHtml(task.id)}" aria-expanded="${state.expandedTaskIds.has(task.id)}">${escapeHtml(task.name)}</button>`
                : `<span class="todo-text task-name-text">${escapeHtml(task.name)}</span>`}
                    ${task.description ? `<button type="button" class="details-indicator" data-action="toggle-details" aria-controls="task-details-${escapeHtml(task.id)}" aria-expanded="${state.expandedTaskIds.has(task.id)}" aria-label="Show details for ${escapeHtml(task.name)}" ${state.expandedTaskIds.has(task.id) ? 'hidden' : ''}>&hellip;</button>` : ''}
                </div>
                <div class="meta">
                    <span class="badge category">${escapeHtml(task.category || 'General')}</span>
                    <span class="badge ${task.priority}">${({ low: 'Low', medium: 'Med', high: 'Hi', 'very-high': 'vHi' })[task.priority]}</span>
                    ${task.deadline ? `<span class="badge date ${getDeadlineColorClass(task.deadline)}">${formatDate(task.deadline)}</span>` : ''}
                </div>
                <button type="button" class="secondary-btn icon-btn task-edit-btn" data-action="edit" data-id="${task.id}" aria-label="Edit ${escapeHtml(task.name)}" title="Edit task">
                    <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-.8L19.2 8a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" /></svg>
                </button>
            </div>
            ${task.description ? `<div id="task-details-${escapeHtml(task.id)}" class="task-details" ${state.expandedTaskIds.has(task.id) ? '' : 'hidden'}><div class="task-description">${renderDescription(task.description)}</div></div>` : ''}
        </div>`;
    }

    function render(app) {
        const { state, refreshCategoryOptions, refreshCategoryFilterOptions } = app;
        const { elements } = app;
        const { categorySelect, taskCount, periodicTaskCount, completeVisibleButton, sortSelect, list, periodicList, tasksPane, periodicPane } = elements;
        refreshCategoryOptions(categorySelect?.value || '');
        refreshCategoryFilterOptions();
        const visibleTasks = getVisibleTasks();
        const periodicTasks = getVisiblePeriodicTasks();
        const toggleTasks = getDisplayedTasks(app);
        const completedVisibleCount = toggleTasks.filter((task) => task.completed).length;
        const toggleState = toggleTasks.length === 0 || completedVisibleCount === 0
            ? 'unchecked' : completedVisibleCount === toggleTasks.length ? 'checked' : 'mixed';
        if (sortSelect) {
            saveSortMode(state.sortMode);
            const sortValue = state.sortMode === 'deadline' ? '1' : '0';
            sortSelect.setAttribute('aria-valuenow', sortValue);
            sortSelect.setAttribute('aria-valuetext', state.sortMode === 'deadline' ? 'Deadline' : 'Priority');
            sortSelect.closest('.sort-slider-control').dataset.mode = state.sortMode;
        }
        taskCount.textContent = String(visibleTasks.length);
        taskCount.setAttribute('aria-label', `${visibleTasks.length} task${visibleTasks.length === 1 ? '' : 's'}`);
        periodicTaskCount.textContent = String(periodicTasks.length);
        periodicTaskCount.setAttribute('aria-label', `${periodicTasks.length} periodic task${periodicTasks.length === 1 ? '' : 's'}`);
        completeVisibleButton.dataset.state = toggleState;
        completeVisibleButton.setAttribute('aria-pressed', toggleState === 'mixed' ? 'mixed' : String(toggleState === 'checked'));
        completeVisibleButton.setAttribute('aria-label', toggleState === 'checked' ? 'Mark visible tasks incomplete' : 'Mark visible tasks complete');
        completeVisibleButton.title = completeVisibleButton.getAttribute('aria-label');
        const renderTasks = (tasks, emptyMessage) => tasks.length
            ? tasks.map((task) => `<li class="todo-item ${task.completed ? 'is-done' : ''}" data-id="${task.id}">${renderTaskView(task, state)}</li>`).join('')
            : `<li class="empty-state">${emptyMessage}</li>`;
        const hasRegularTasks = state.tasks.some((task) => !task.periodic);
        const hasPeriodicTasks = state.tasks.some((task) => task.periodic);
        const regularEmptyMessage = state.categoryFilter && hasRegularTasks ? 'No tasks of the selected category.' : 'No tasks in this view yet.';
        const periodicEmptyMessage = state.categoryFilter && hasPeriodicTasks ? 'No periodic tasks of the selected category.' : 'No periodic tasks yet.';
        list.innerHTML = renderTasks(visibleTasks, regularEmptyMessage);
        periodicList.innerHTML = renderTasks(periodicTasks, periodicEmptyMessage);
    }

    window.TodoRenderer = { render, getDisplayedTasks };
})();
