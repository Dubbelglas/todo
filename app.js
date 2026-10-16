(() => {
    const URL_PREFIXES = ['https://', 'http://', 'www.'];
    const URL_SUFFIXES = [
        'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro', 'xyz', 'online', 'site', 'app', 'dev', 'tech', 'store', 'shop', 'blog', 'cloud', 'io', 'ai', 'co', 'me', 'tv', 'us', 'uk', 'ca', 'au', 'nz', 'ie', 'de', 'fr', 'nl', 'be', 'lu', 'ch', 'at', 'es', 'pt', 'it', 'se', 'no', 'dk', 'fi', 'is', 'pl', 'cz', 'sk', 'hu', 'ro', 'bg', 'gr', 'tr', 'ru', 'ua', 'il', 'in', 'cn', 'jp', 'kr', 'tw', 'hk', 'sg', 'my', 'id', 'th', 'vn', 'ph', 'br', 'mx', 'ar', 'cl', 'za', 'ng', 'ke', 'eg', 'sa', 'ae', 'cat', 'jobs', 'museum', 'travel', 'coop', 'aero', 'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.br', 'com.cn', 'com.sg', 'co.in',
    ];

    const {
        state,
        normalizePriority,
        getPriorityDisplayName,
        saveTasks,
        saveSortMode,
        escapeHtml,
        getCategories,
        createTask,
        getVisibleTasks,
        getVisiblePeriodicTasks,
        formatDate,
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

    function speakCompletionPraise() {
        if (!('speechSynthesis' in window)) return;

        const utterance = new SpeechSynthesisUtterance('Proper good job mate!');
        utterance.lang = 'en-GB';
        utterance.rate = 1.08;
        utterance.pitch = 1.18;
        utterance.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((voice) =>
            /^en-GB/i.test(voice.lang) && /male|daniel|george|ryan|oliver|arthur/i.test(voice.name));
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }

    function playSadTrombone() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        try {
            const audioContext = new AudioContextClass();
            const oscillator = audioContext.createOscillator();
            const filter = audioContext.createBiquadFilter();
            const volume = audioContext.createGain();
            const start = audioContext.currentTime;
            const notes = [233.1, 220, 207.7, 196];
            const noteLength = 0.24;
            const harmonicTones = new Float32Array(9);
            const harmonicLevels = new Float32Array(9);
            for (let harmonic = 1; harmonic < harmonicLevels.length; harmonic += 1) {
                harmonicLevels[harmonic] = 1 / harmonic ** 1.35;
            }

            oscillator.setPeriodicWave(audioContext.createPeriodicWave(harmonicTones, harmonicLevels));
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1500, start);
            filter.frequency.exponentialRampToValueAtTime(650, start + 1.2);
            filter.Q.value = 2.2;
            volume.gain.setValueAtTime(0.0001, start);
            notes.forEach((frequency, index) => {
                const noteStart = start + index * noteLength;
                const isFinalNote = index === notes.length - 1;
                const noteEnd = noteStart + (isFinalNote ? 0.95 : noteLength);
                oscillator.frequency.setValueAtTime(frequency * 1.025, noteStart);
                oscillator.frequency.exponentialRampToValueAtTime(frequency, noteStart + 0.09);
                if (isFinalNote) {
                    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.82, noteEnd - 0.06);
                }
                volume.gain.setValueAtTime(0.0001, noteStart);
                volume.gain.linearRampToValueAtTime(isFinalNote ? 0.2 : 0.15, noteStart + 0.025);
                volume.gain.setTargetAtTime(isFinalNote ? 0.13 : 0.0001, noteEnd - (isFinalNote ? 0.16 : 0.035), isFinalNote ? 0.25 : 0.035);
                if (isFinalNote) {
                    volume.gain.setTargetAtTime(0.0001, noteEnd - 0.06, 0.055);
                }
            });

            oscillator.connect(filter);
            filter.connect(volume);
            volume.connect(audioContext.destination);
            oscillator.start(start);
            oscillator.stop(start + (notes.length - 1) * noteLength + 1.05);
            window.setTimeout(() => audioContext.close(), 2400);
        } catch (error) {
            // Audio is optional; task updates still work without it.
        }
    }

    function showConfetti() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.setAttribute('aria-hidden', 'true');
        Object.assign(canvas.style, {
            position: 'fixed',
            inset: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '1300',
        });
        document.body.append(canvas);

        const scale = window.devicePixelRatio || 1;
        const resize = () => {
            canvas.width = Math.floor(window.innerWidth * scale);
            canvas.height = Math.floor(window.innerHeight * scale);
            context.setTransform(scale, 0, 0, scale, 0, 0);
        };
        resize();
        const colors = ['#facc15', '#84cc16', '#38bdf8', '#f472b6', '#fb923c', '#a78bfa'];
        const pieces = Array.from({ length: 130 }, () => ({
            x: Math.random() * window.innerWidth,
            y: -20 - Math.random() * window.innerHeight * 0.35,
            width: 5 + Math.random() * 7,
            height: 7 + Math.random() * 10,
            speed: 2.5 + Math.random() * 4,
            drift: (Math.random() - 0.5) * 2.5,
            rotation: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.18,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
        const startedAt = performance.now();
        const draw = (now) => {
            const elapsed = now - startedAt;
            context.clearRect(0, 0, window.innerWidth, window.innerHeight);
            for (const piece of pieces) {
                piece.x += piece.drift;
                piece.y += piece.speed;
                piece.rotation += piece.spin;
                context.save();
                context.translate(piece.x, piece.y);
                context.rotate(piece.rotation);
                context.fillStyle = piece.color;
                context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
                context.restore();
            }
            if (elapsed < 2200) {
                requestAnimationFrame(draw);
            } else {
                window.removeEventListener('resize', resize);
                canvas.remove();
            }
        };
        window.addEventListener('resize', resize);
        requestAnimationFrame(draw);
    }

    function celebrateTaskCompletion() {
        speakCompletionPraise();
        showConfetti();
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
            return {
                indent: match[1].replace(/\t/g, '    ').length,
                type: /^\d/.test(match[2]) ? 'ol' : 'ul',
                text: match[3],
            };
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
            if (!lines[index].trim()) {
                index += 1;
                continue;
            }

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
        return [
            ...(tasksPane.open ? getVisibleTasks() : []),
            ...(periodicPane.open ? getVisiblePeriodicTasks() : []),
        ];
    }

    function renderTaskView(task) {
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

                <!-- Badge: category / priority / deadline -->
                <div class="meta">
                    <span class="badge category">${escapeHtml(task.category || 'General')}</span>
                    <span class="badge ${task.priority}">${({ low: 'Low', medium: 'Med', high: 'Hi', 'very-high': 'vHi' })[task.priority]}</span>
                    ${task.deadline ? `<span class="badge date ${getDeadlineColorClass(task.deadline)}">${formatDate(task.deadline)}</span>` : ''}
                </div>

                <!-- Edit button -->
                <button type="button" class="secondary-btn icon-btn task-edit-btn" data-action="edit" data-id="${task.id}" aria-label="Edit ${escapeHtml(task.name)}" title="Edit task">
                    <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m15 5 4 4M4 20l4-.8L19.2 8a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" />
                    </svg>
                </button>
            </div>

            ${task.description ? `
                <div id="task-details-${escapeHtml(task.id)}" class="task-details" ${state.expandedTaskIds.has(task.id) ? '' : 'hidden'}>
                    <div class="task-description">${renderDescription(task.description)}</div>
                </div>
            ` : ''}

        </div>
    `;
    }

    function render() {
        refreshCategoryOptions(categorySelect?.value || '');
        refreshCategoryFilterOptions();
        const visibleTasks = getVisibleTasks();
        const periodicTasks = getVisiblePeriodicTasks();
        const toggleTasks = getDisplayedTasks();
        const completedVisibleCount = toggleTasks.filter((task) => task.completed).length;
        const toggleState = toggleTasks.length === 0 || completedVisibleCount === 0
            ? 'unchecked'
            : completedVisibleCount === toggleTasks.length ? 'checked' : 'mixed';
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
        completeVisibleButton.setAttribute('aria-label', toggleState === 'checked'
            ? 'Mark visible tasks incomplete'
            : 'Mark visible tasks complete');
        completeVisibleButton.title = completeVisibleButton.getAttribute('aria-label');

        const renderTasks = (tasks, emptyMessage) => tasks.length
            ? tasks.map((task) => `
            <li class="todo-item ${task.completed ? 'is-done' : ''}" data-id="${task.id}">
                ${renderTaskView(task)}
            </li>
        `)
                .join('')
            : `<li class="empty-state">${emptyMessage}</li>`;

        const hasRegularTasks = state.tasks.some((task) => !task.periodic);
        const hasPeriodicTasks = state.tasks.some((task) => task.periodic);
        const regularEmptyMessage = state.categoryFilter && hasRegularTasks
            ? 'No tasks of the selected category.'
            : 'No tasks in this view yet.';
        const periodicEmptyMessage = state.categoryFilter && hasPeriodicTasks
            ? 'No periodic tasks of the selected category.'
            : 'No periodic tasks yet.';

        list.innerHTML = renderTasks(visibleTasks, regularEmptyMessage);
        periodicList.innerHTML = renderTasks(periodicTasks, periodicEmptyMessage);
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
        showConfirmation,
        celebrateTaskCompletion,
        playSadTrombone,
        updateCategoryValidation,
        attemptCategoryValidation,
        updateNewCategoryVisibility,
        refreshCategoryOptions,
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

