(() => {
    const URL_PREFIXES = ['https://', 'http://', 'www.'];
    const URL_SUFFIXES = [
        'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro', 'xyz', 'online', 'site', 'app', 'dev', 'tech', 'store', 'shop', 'blog', 'cloud', 'io', 'ai', 'co', 'me', 'tv', 'us', 'uk', 'ca', 'au', 'nz', 'ie', 'de', 'fr', 'nl', 'be', 'lu', 'ch', 'at', 'es', 'pt', 'it', 'se', 'no', 'dk', 'fi', 'is', 'pl', 'cz', 'sk', 'hu', 'ro', 'bg', 'gr', 'tr', 'ru', 'ua', 'il', 'in', 'cn', 'jp', 'kr', 'tw', 'hk', 'sg', 'my', 'id', 'th', 'vn', 'ph', 'br', 'mx', 'ar', 'cl', 'za', 'ng', 'ke', 'eg', 'sa', 'ae', 'cat', 'jobs', 'museum', 'travel', 'coop', 'aero', 'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.br', 'com.cn', 'com.sg', 'co.in',
    ];

    const { escapeHtml, formatDate, getVisibleTasks, getVisiblePeriodicTasks, saveSortMode } = window.TodoData;

    function renderDescription(description) {
        const renderLinkedText = (text) => {
            const source = String(text);
            const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const prefixPattern = URL_PREFIXES.map(escapeRegex).join('|');
            const suffixPattern = [...URL_SUFFIXES].sort((a, b) => b.length - a.length).map(escapeRegex).join('|');
            const urlPattern = new RegExp(`(?:\\b(?:${prefixPattern})[^\\s<]+|\\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${suffixPattern})(?:/[^\\s<]*)?)`, 'gi');
            const emailPattern = /\b[a-z0-9_+-](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9_+-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}\b/gi;
            const renderUrls = (segment) => {
                let result = '';
                let lastIndex = 0;
                for (const match of segment.matchAll(urlPattern)) {
                    let url = match[0];
                    let trailing = '';
                    while (/[.,!?;:)]$/.test(url)) {
                        trailing = url.slice(-1) + trailing;
                        url = url.slice(0, -1);
                    }
                    if (!url) continue;
                    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                    const start = match.index;
                    result += escapeHtml(segment.slice(lastIndex, start));
                    result += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>${escapeHtml(trailing)}`;
                    lastIndex = start + match[0].length;
                }
                return result + escapeHtml(segment.slice(lastIndex));
            };
            let result = '';
            let lastIndex = 0;
            for (const match of source.matchAll(emailPattern)) {
                result += renderUrls(source.slice(lastIndex, match.index));
                result += `<button type="button" class="email-link" data-email="${escapeHtml(match[0])}" title="Copy email address">${escapeHtml(match[0])}</button>`;
                lastIndex = match.index + match[0].length;
            }
            return result + renderUrls(source.slice(lastIndex));
        };
        const lines = String(description).replace(/\r\n?/g, '\n').split('\n');
        const blocks = [];
        const getListItem = (line) => {
            const match = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.+)$/);
            if (!match) return null;
            return { indent: match[1].replace(/\t/g, '    ').length, type: /^\d/.test(match[2]) ? 'ol' : 'ul', text: match[3] };
        };
        const renderList = (start, indent, type) => {
            const items = [];
            let index = start;
            while (index < lines.length) {
                const item = getListItem(lines[index]);
                if (!item || item.indent < indent) break;
                if (item.indent > indent) {
                    if (items.length) {
                        const nested = renderList(index, item.indent, item.type);
                        items[items.length - 1] += nested.html;
                        index = nested.nextIndex;
                        continue;
                    }
                    break;
                }
                if (item.type !== type) break;
                index += 1;
                let nestedHtml = '';
                while (index < lines.length) {
                    const nestedItem = getListItem(lines[index]);
                    if (!nestedItem || nestedItem.indent <= indent) break;
                    const nested = renderList(index, nestedItem.indent, nestedItem.type);
                    nestedHtml += nested.html;
                    index = nested.nextIndex;
                }
                items.push(`<li>${renderLinkedText(item.text)}${nestedHtml}</li>`);
            }
            return { html: `<${type}>${items.join('')}</${type}>`, nextIndex: index };
        };
        let index = 0;
        while (index < lines.length) {
            if (!lines[index].trim()) { index += 1; continue; }
            const item = getListItem(lines[index]);
            if (item) {
                const rendered = renderList(index, item.indent, item.type);
                blocks.push(rendered.html);
                index = rendered.nextIndex;
                continue;
            }
            const paragraph = [];
            while (index < lines.length && lines[index].trim() && !getListItem(lines[index])) {
                paragraph.push(lines[index]);
                index += 1;
            }
            blocks.push(`<p>${paragraph.map(renderLinkedText).join('<br>')}</p>`);
        }
        return blocks.join('');
    }

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
