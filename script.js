// Kanban Board Application - Material Design - Pack Professionnel avec Grille 2D
class KanbanBoard {
    constructor() {
        // Load all data
        const data = this.loadAllData();
        this.tasks = data.tasks || [];
        this.columns = data.columns || this.getDefaultColumns();
        this.rows = data.rows || this.getDefaultRows();
        
        // Migrate old tasks if needed
        this.tasks = this.tasks.map(task => ({
            ...task,
            columnId: task.columnId || this.columns[0]?.id,
            rowId: task.rowId || this.rows[0]?.id
        }));

        // Assign order to tasks that don't have one
        this.migrateTaskOrders();
        
        // UI State
        this.draggedElement = null;
        this.dragPlaceholder = null;
        this.currentTaskId = null;
        this.currentColumnId = null;
        this.currentRowId = null;
        this.searchQuery = '';
        this.activeTagFilters = [];
        this.charts = {};

        // Due date reminders
        this.lastReminderCheck = 0;
        this.reminderInterval = null;
        this.notificationHistory = new Set();

        // Theme management
        this.currentTheme = this.loadThemePreference();

        // Task templates
        this.taskTemplates = {
            bug: {
                title: 'Corriger le bug : ',
                description: 'Description du bug à corriger',
                priority: 'high',
                tags: ['bug', 'urgent']
            },
            feature: {
                title: 'Nouvelle fonctionnalité : ',
                description: 'Description de la fonctionnalité à développer',
                priority: 'medium',
                tags: ['feature', 'frontend']
            },
            meeting: {
                title: 'Réunion : ',
                description: 'Sujet de la réunion et objectifs',
                priority: 'medium',
                tags: ['meeting']
            },
            urgent: {
                title: 'URGENT : ',
                description: 'Tâche urgente nécessitant une attention immédiate',
                priority: 'urgent',
                tags: ['urgent']
            },
            design: {
                title: 'Design : ',
                description: 'Description du travail de design à effectuer',
                priority: 'medium',
                tags: ['design']
            },
            documentation: {
                title: 'Documentation : ',
                description: 'Documentation à rédiger ou mettre à jour',
                priority: 'low',
                tags: ['documentation']
            }
        };

        this.initializeElements();
        this.attachEventListeners();
        this.applyTheme();
        this.watchSystemTheme();
        this.renderBoard();
        this.updateTagFilters();
        this.startDueDateReminders();
    }

    migrateTaskOrders() {
        // Group tasks by column and row
        const tasksByLocation = {};

        this.tasks.forEach(task => {
            const key = `${task.columnId}-${task.rowId}`;
            if (!tasksByLocation[key]) {
                tasksByLocation[key] = [];
            }
            tasksByLocation[key].push(task);
        });

        // Assign order to tasks that don't have one
        Object.values(tasksByLocation).forEach(locationTasks => {
            locationTasks.forEach((task, index) => {
                if (task.order === undefined || task.order === null) {
                    task.order = index;
                }
            });
        });

        this.saveAllData();
    }

    // Default data structures
    getDefaultColumns() {
        return [
            { id: 'col-1', name: 'À faire', emoji: '📝', color: '#1976d2', order: 0 },
            { id: 'col-2', name: 'En cours', emoji: '⚡', color: '#ff9800', order: 1 },
            { id: 'col-3', name: 'Révision', emoji: '👁️', color: '#9c27b0', order: 2 },
            { id: 'col-4', name: 'Terminé', emoji: '✅', color: '#4caf50', order: 3 }
        ];
    }

    getDefaultRows() {
        return [
            { id: 'row-1', name: 'Général', color: '#757575', order: 0 }
        ];
    }

    initializeElements() {
        // Main elements
        this.kanbanBoard = document.getElementById('kanbanBoard');
        this.addTaskBtn = document.getElementById('addTaskBtn');

        // Modal elements
        this.modalOverlay = document.getElementById('modalOverlay');
        this.editModalOverlay = document.getElementById('editModalOverlay');
        this.analyticsModal = document.getElementById('analyticsModal');
        this.columnModal = document.getElementById('columnModal');
        this.rowModal = document.getElementById('rowModal');
        this.editColumnModal = document.getElementById('editColumnModal');
        this.editRowModal = document.getElementById('editRowModal');

        this.taskForm = document.getElementById('taskForm');
        this.editTaskForm = document.getElementById('editTaskForm');
        this.columnForm = document.getElementById('columnForm');
        this.rowForm = document.getElementById('rowForm');

        // Form inputs - Task
        this.taskTitle = document.getElementById('taskTitle');
        this.taskDescription = document.getElementById('taskDescription');
        this.taskPriority = document.getElementById('taskPriority');
        this.taskAssignee = document.getElementById('taskAssignee');
        this.taskTags = document.getElementById('taskTags');
        this.taskDueDate = document.getElementById('taskDueDate');
        this.taskRow = document.getElementById('taskRow');

        // Edit form inputs - Task
        this.editTaskId = document.getElementById('editTaskId');
        this.editTaskTitle = document.getElementById('editTaskTitle');
        this.editTaskDescription = document.getElementById('editTaskDescription');
        this.editTaskPriority = document.getElementById('editTaskPriority');
        this.editTaskAssignee = document.getElementById('editTaskAssignee');
        this.editTaskTags = document.getElementById('editTaskTags');
        this.editTaskDueDate = document.getElementById('editTaskDueDate');
        this.editTaskRow = document.getElementById('editTaskRow');

        // Edit subtasks
        this.editSubtaskInput = document.getElementById('editSubtaskInput');
        this.addSubtaskBtn = document.getElementById('addSubtaskBtn');
        this.editSubtasksList = document.getElementById('editSubtasksList');

        // Theme toggle
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
        this.themeIcon = document.getElementById('themeIcon');

        // Form inputs - Column
        this.columnId = document.getElementById('columnId');
        this.columnName = document.getElementById('columnName');
        this.columnEmoji = document.getElementById('columnEmoji');
        this.columnColor = document.getElementById('columnColor');

        // Form inputs - Row
        this.rowId = document.getElementById('rowId');
        this.rowName = document.getElementById('rowName');
        this.rowColor = document.getElementById('rowColor');

        // Buttons
        this.modalClose = document.getElementById('modalClose');
        this.editModalClose = document.getElementById('editModalClose');
        this.analyticsClose = document.getElementById('analyticsClose');
        this.columnModalClose = document.getElementById('columnModalClose');
        this.rowModalClose = document.getElementById('rowModalClose');
        this.editColumnClose = document.getElementById('editColumnClose');
        this.editRowClose = document.getElementById('editRowClose');

        this.cancelBtn = document.getElementById('cancelBtn');
        this.deleteTaskBtn = document.getElementById('deleteTaskBtn');
        this.cancelColumnBtn = document.getElementById('cancelColumnBtn');
        this.cancelRowBtn = document.getElementById('cancelRowBtn');

        this.analyticsBtn = document.getElementById('analyticsBtn');
        this.manageColumnsBtn = document.getElementById('manageColumnsBtn');
        this.manageRowsBtn = document.getElementById('manageRowsBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');
        this.importFile = document.getElementById('importFile');

        this.addColumnBtn = document.getElementById('addColumnBtn');
        this.addRowBtn = document.getElementById('addRowBtn');

        // Urgent badge
        this.urgentBadge = document.getElementById('urgentBadge');
        this.urgentCount = document.getElementById('urgentCount');

        // Lists
        this.columnsList = document.getElementById('columnsList');
        this.rowsList = document.getElementById('rowsList');

        // Search & Filter
        this.searchInput = document.getElementById('searchInput');
        this.clearSearch = document.getElementById('clearSearch');
        this.filterTags = document.getElementById('filterTags');

        // Toast
        this.toastContainer = document.getElementById('toastContainer');
    }

    attachEventListeners() {
        // Task management
        this.addTaskBtn.addEventListener('click', () => this.openTaskModal());
        this.taskForm.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        this.editTaskForm.addEventListener('submit', (e) => this.handleEditTaskSubmit(e));
        this.deleteTaskBtn.addEventListener('click', () => this.handleDeleteTask());

        // Column management
        this.manageColumnsBtn.addEventListener('click', () => this.openColumnManagementModal());
        this.addColumnBtn.addEventListener('click', () => this.openColumnEditModal(null));
        this.columnForm.addEventListener('submit', (e) => this.handleColumnSubmit(e));

        // Row management
        this.manageRowsBtn.addEventListener('click', () => this.openRowManagementModal());
        this.addRowBtn.addEventListener('click', () => this.openRowEditModal(null));
        this.rowForm.addEventListener('submit', (e) => this.handleRowSubmit(e));

        // Modal close buttons
        this.modalClose.addEventListener('click', () => this.closeTaskModal());
        this.editModalClose.addEventListener('click', () => this.closeEditTaskModal());
        this.analyticsClose.addEventListener('click', () => this.closeAnalyticsModal());
        this.columnModalClose.addEventListener('click', () => this.closeColumnManagementModal());
        this.rowModalClose.addEventListener('click', () => this.closeRowManagementModal());
        this.editColumnClose.addEventListener('click', () => this.closeColumnEditModal());
        this.editRowClose.addEventListener('click', () => this.closeRowEditModal());

        this.cancelBtn.addEventListener('click', () => this.closeTaskModal());
        this.cancelColumnBtn.addEventListener('click', () => this.closeColumnEditModal());
        this.cancelRowBtn.addEventListener('click', () => this.closeRowEditModal());

        // Analytics, Export, Import
        this.analyticsBtn.addEventListener('click', () => this.openAnalyticsModal());
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.importData(e));

        // Search
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.clearSearch.addEventListener('click', () => this.clearSearchQuery());

        // Tag suggestions
        document.querySelectorAll('.tag-suggest').forEach(btn => {
            btn.addEventListener('click', () => this.addTagToInput(this.taskTags, btn.dataset.tag));
        });
        document.querySelectorAll('.tag-suggest-edit').forEach(btn => {
            btn.addEventListener('click', () => this.addTagToInput(this.editTaskTags, btn.dataset.tag));
        });

        // Emoji suggestions
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.columnEmoji.value = btn.dataset.emoji;
            });
        });

        // Task templates
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyTaskTemplate(btn.dataset.template);
            });
        });

        // Edit subtasks
        this.addSubtaskBtn.addEventListener('click', () => this.addSubtaskFromInput());
        this.editSubtaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addSubtaskFromInput();
            }
        });

        // Theme toggle
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

        // Color suggestions
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.columnColor.value = btn.dataset.color;
            });
        });
        document.querySelectorAll('.color-btn-row').forEach(btn => {
            btn.addEventListener('click', () => {
                this.rowColor.value = btn.dataset.color;
            });
        });

        // Modal overlay clicks
        [this.modalOverlay, this.editModalOverlay, this.analyticsModal, this.columnModal, 
         this.rowModal, this.editColumnModal, this.editRowModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                    }
                });
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });

        // Drag and drop events
        this.kanbanBoard.addEventListener('dragstart', (e) => this.handleDragStart(e));
        this.kanbanBoard.addEventListener('dragend', (e) => this.handleDragEnd(e));
        this.kanbanBoard.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.kanbanBoard.addEventListener('drop', (e) => this.handleDrop(e));

        // Touch events for mobile
        this.kanbanBoard.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.kanbanBoard.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.kanbanBoard.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    }

    // === TASK MANAGEMENT ===
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    createTask(title, description, priority, assignee, columnId, rowId, tags = [], dueDate = null, subtasks = []) {
        const task = {
            id: this.generateId(),
            title: title.trim(),
            description: description.trim(),
            priority: priority,
            assignee: assignee.trim(),
            columnId: columnId,
            rowId: rowId,
            tags: Array.isArray(tags) ? tags : [],
            dueDate: dueDate || null,
            subtasks: Array.isArray(subtasks) ? subtasks : [],
            order: this.getNextOrderInColumn(columnId, rowId),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.tasks.push(task);
        this.saveAllData();

        // Update urgent badge after creating task
        this.updateUrgentBadge();

        return task;
    }

    getNextOrderInColumn(columnId, rowId) {
        const tasksInColumn = this.tasks.filter(t => t.columnId === columnId && t.rowId === rowId);
        if (tasksInColumn.length === 0) return 0;
        const maxOrder = Math.max(...tasksInColumn.map(t => t.order || 0));
        return maxOrder + 1;
    }

    updateTask(id, updates) {
        const taskIndex = this.tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveAllData();

            // Update urgent badge after task changes
            this.updateUrgentBadge();

            return this.tasks[taskIndex];
        }
        return null;
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveAllData();
    }

    reorderTasksInColumn(columnId, rowId, draggedTaskId, targetElement) {
        const tasksInColumn = this.tasks
            .filter(t => t.columnId === columnId && t.rowId === rowId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        const draggedTask = this.tasks.find(t => t.id === draggedTaskId);
        if (!draggedTask) return;

        // Remove dragged task from current position
        const filteredTasks = tasksInColumn.filter(t => t.id !== draggedTaskId);

        // Find insertion index based on target element
        let insertIndex = filteredTasks.length; // Default to end

        if (targetElement && targetElement.classList.contains('task-card')) {
            const targetTaskId = targetElement.dataset.taskId;
            const targetTaskIndex = filteredTasks.findIndex(t => t.id === targetTaskId);
            if (targetTaskIndex !== -1) {
                insertIndex = targetTaskIndex;
            }
        }

        // Insert dragged task at new position
        filteredTasks.splice(insertIndex, 0, draggedTask);

        // Update orders
        filteredTasks.forEach((task, index) => {
            task.order = index;
        });

        this.saveAllData();
    }

    // === SUBTASK MANAGEMENT ===
    addSubtask(taskId, subtaskText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return false;

        if (!task.subtasks) task.subtasks = [];

        const subtask = {
            id: this.generateId(),
            text: subtaskText.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };

        task.subtasks.push(subtask);
        this.saveAllData();
        this.renderBoard();
        return true;
    }

    toggleSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.subtasks) return false;

        const subtask = task.subtasks.find(st => st.id === subtaskId);
        if (!subtask) return false;

        subtask.completed = !subtask.completed;
        this.saveAllData();
        this.renderBoard();
        return true;
    }

    deleteSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.subtasks) return false;

        task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
        this.saveAllData();
        this.renderBoard();
        return true;
    }

    getSubtaskProgress(task) {
        if (!task.subtasks || task.subtasks.length === 0) {
            return { completed: 0, total: 0, percentage: 0 };
        }

        const completed = task.subtasks.filter(st => st.completed).length;
        const total = task.subtasks.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, total, percentage };
    }

    // === COLUMN MANAGEMENT ===
    createColumn(name, emoji, color) {
        const column = {
            id: this.generateId(),
            name: name.trim(),
            emoji: emoji || '📌',
            color: color || '#1976d2',
            order: this.columns.length
        };
        this.columns.push(column);
        this.saveAllData();
        return column;
    }

    updateColumn(id, updates) {
        const colIndex = this.columns.findIndex(col => col.id === id);
        if (colIndex !== -1) {
            this.columns[colIndex] = { ...this.columns[colIndex], ...updates };
            this.saveAllData();
            return this.columns[colIndex];
        }
        return null;
    }

    deleteColumn(id) {
        if (this.columns.length <= 1) {
            this.showToast('error', 'error', 'Impossible de supprimer la dernière colonne !');
            return;
        }

        const tasksInColumn = this.tasks.filter(t => t.columnId === id);
        if (tasksInColumn.length > 0) {
            const newColumnId = this.columns.find(c => c.id !== id)?.id;
            if (confirm(`${tasksInColumn.length} tâche(s) seront déplacées vers une autre colonne. Continuer ?`)) {
                tasksInColumn.forEach(task => {
                    this.updateTask(task.id, { columnId: newColumnId });
                });
            } else {
                return;
            }
        }

        this.columns = this.columns.filter(col => col.id !== id);
        this.saveAllData();
        this.showToast('success', 'delete', 'Colonne supprimée avec succès !');
    }

    // === ROW MANAGEMENT ===
    createRow(name, color) {
        const row = {
            id: this.generateId(),
            name: name.trim(),
            color: color || '#757575',
            order: this.rows.length
        };
        this.rows.push(row);
        this.saveAllData();
        return row;
    }

    updateRow(id, updates) {
        const rowIndex = this.rows.findIndex(row => row.id === id);
        if (rowIndex !== -1) {
            this.rows[rowIndex] = { ...this.rows[rowIndex], ...updates };
            this.saveAllData();
            return this.rows[rowIndex];
        }
        return null;
    }

    deleteRow(id) {
        if (this.rows.length <= 1) {
            this.showToast('error', 'error', 'Impossible de supprimer la dernière ligne !');
            return;
        }

        const tasksInRow = this.tasks.filter(t => t.rowId === id);
        if (tasksInRow.length > 0) {
            const newRowId = this.rows.find(r => r.id !== id)?.id;
            if (confirm(`${tasksInRow.length} tâche(s) seront déplacées vers une autre ligne. Continuer ?`)) {
                tasksInRow.forEach(task => {
                    this.updateTask(task.id, { rowId: newRowId });
                });
            } else {
                return;
            }
        }

        this.rows = this.rows.filter(row => row.id !== id);
        this.saveAllData();
        this.showToast('success', 'delete', 'Ligne supprimée avec succès !');
    }

    // === STORAGE MANAGEMENT ===
    loadAllData() {
        try {
            const storedData = localStorage.getItem('kanban-data-2d');
            return storedData ? JSON.parse(storedData) : {};
        } catch (error) {
            console.error('Error loading data:', error);
            return {};
        }
    }

    saveAllData() {
        try {
            const dataToSave = {
                version: '2.0',
                tasks: this.tasks,
                columns: this.columns,
                rows: this.rows,
                lastUpdate: new Date().toISOString()
            };
            localStorage.setItem('kanban-data-2d', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('error', 'error', 'Erreur de sauvegarde !');
        }
    }

    // === UI RENDERING ===
    renderBoard() {
        const is2D = this.rows.length > 1;
        this.kanbanBoard.className = is2D ? 'kanban-board grid-2d' : 'kanban-board';
        this.kanbanBoard.innerHTML = '';

        const sortedRows = [...this.rows].sort((a, b) => a.order - b.order);
        const sortedColumns = [...this.columns].sort((a, b) => a.order - b.order);

        sortedRows.forEach(row => {
            if (is2D) {
                this.kanbanBoard.appendChild(this.createRowElement(row, sortedColumns));
            } else {
                // Single row: render columns directly
                sortedColumns.forEach(column => {
                    this.kanbanBoard.appendChild(this.createColumnElement(column, row.id, false));
                });
            }
        });

        this.renderAllTasks();
    }

    createRowElement(row, columns) {
        const rowElement = document.createElement('div');
        rowElement.className = 'kanban-row';
        rowElement.dataset.rowId = row.id;

        rowElement.innerHTML = `
            <div class="row-header">
                <div class="row-title">
                    <div class="row-color-bar" style="background-color: ${row.color}"></div>
                    <span>${this.escapeHtml(row.name)}</span>
                </div>
                <div class="row-actions">
                    <button class="item-btn edit-row" data-row-id="${row.id}" title="Éditer">
                        <span class="material-icons">edit</span>
                    </button>
                    ${this.rows.length > 1 ? `
                    <button class="item-btn delete delete-row" data-row-id="${row.id}" title="Supprimer">
                        <span class="material-icons">delete</span>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="row-columns"></div>
        `;

        const rowColumns = rowElement.querySelector('.row-columns');
        columns.forEach(column => {
            rowColumns.appendChild(this.createColumnElement(column, row.id, true));
        });

        // Attach row action listeners
        const editBtn = rowElement.querySelector('.edit-row');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.openRowEditModal(row.id));
        }

        const deleteBtn = rowElement.querySelector('.delete-row');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteRow(row.id);
                this.renderBoard();
                this.renderColumnsList();
            });
        }

        return rowElement;
    }

    createColumnElement(column, rowId, is2D) {
        const columnElement = document.createElement('div');
        columnElement.className = 'kanban-column';
        columnElement.dataset.columnId = column.id;
        columnElement.dataset.rowId = rowId;

        const tasksCount = this.getTasksByLocation(column.id, rowId).length;

        columnElement.innerHTML = `
            <div class="column-header" style="border-top: 3px solid ${column.color}">
                <h2 class="column-title">
                    <span class="column-icon">${column.emoji}</span>
                    ${this.escapeHtml(column.name)}
                </h2>
                <span class="task-count">${tasksCount}</span>
            </div>
            <div class="column-content" data-column-id="${column.id}" data-row-id="${rowId}">
                <!-- Tasks will be added here -->
            </div>
        `;

        return columnElement;
    }

    renderAllTasks() {
        const filteredTasks = this.getFilteredTasks();

        // Clear all columns
        document.querySelectorAll('.column-content').forEach(content => {
            content.innerHTML = '';
        });

        // Sort tasks by order before rendering
        const sortedTasks = filteredTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Render filtered tasks
        sortedTasks.forEach(task => {
            const columnContent = document.querySelector(
                `.column-content[data-column-id="${task.columnId}"][data-row-id="${task.rowId}"]`
            );

            if (columnContent) {
                const taskElement = this.createTaskElement(task);
                columnContent.appendChild(taskElement);
            }
        });

        this.updateAllTaskCounts();
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.draggable = true;
        taskElement.dataset.taskId = task.id;

        const priorityClass = `task-priority ${task.priority}`;
        const formattedDate = this.formatDate(task.createdAt);
        const dueDateBadge = this.createDueDateBadge(task.dueDate);
        const tagsHtml = this.createTagsHtml(task.tags);
        const subtaskProgress = this.getSubtaskProgress(task);
        const progressBarHtml = subtaskProgress.total > 0 ? this.createProgressBar(subtaskProgress) : '';
        const subtasksHtml = this.createSubtasksHtml(task);

        taskElement.innerHTML = `
            <div class="task-header">
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div class="${priorityClass}" title="Priorité: ${this.getPriorityLabel(task.priority)}"></div>
            </div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            ${tagsHtml}
            ${progressBarHtml}
            ${subtasksHtml}
            ${dueDateBadge}
            <div class="task-footer">
                ${task.assignee ? `<div class="task-assignee"><span class="material-icons">person</span>${this.escapeHtml(task.assignee)}</div>` : '<div></div>'}
                <div class="task-date">${formattedDate}</div>
            </div>
        `;

        // Add event listeners for subtasks
        this.attachSubtaskEventListeners(taskElement, task);

        taskElement.addEventListener('dblclick', () => this.openEditTaskModal(task.id));
        return taskElement;
    }

    updateAllTaskCounts() {
        this.rows.forEach(row => {
            this.columns.forEach(column => {
                const count = this.getTasksByLocation(column.id, row.id).length;
                const columnElement = document.querySelector(
                    `.kanban-column[data-column-id="${column.id}"][data-row-id="${row.id}"] .task-count`
                );
                if (columnElement) {
                    columnElement.textContent = count;
                }
            });
        });
    }

    getTasksByLocation(columnId, rowId) {
        return this.tasks.filter(task => task.columnId === columnId && task.rowId === rowId);
    }

    // === COLUMN MANAGEMENT UI ===
    openColumnManagementModal() {
        this.columnModal.classList.add('active');
        this.renderColumnsList();
    }

    closeColumnManagementModal() {
        this.columnModal.classList.remove('active');
    }

    renderColumnsList() {
        const sorted = [...this.columns].sort((a, b) => a.order - b.order);
        this.columnsList.innerHTML = '';

        sorted.forEach(column => {
            const taskCount = this.tasks.filter(t => t.columnId === column.id).length;
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.innerHTML = `
                <div class="item-info">
                    <div class="item-emoji">${column.emoji}</div>
                    <div class="item-color-indicator" style="background-color: ${column.color}"></div>
                    <div class="item-details">
                        <div class="item-name">${this.escapeHtml(column.name)}</div>
                        <div class="item-meta">${taskCount} tâche(s)</div>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-btn edit" data-column-id="${column.id}" title="Éditer">
                        <span class="material-icons">edit</span>
                    </button>
                    ${this.columns.length > 1 ? `
                    <button class="item-btn delete" data-column-id="${column.id}" title="Supprimer">
                        <span class="material-icons">delete</span>
                    </button>
                    ` : ''}
                </div>
            `;

            itemCard.querySelector('.edit').addEventListener('click', () => {
                this.openColumnEditModal(column.id);
            });

            const deleteBtn = itemCard.querySelector('.delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteColumn(column.id);
                    this.renderBoard();
                    this.renderColumnsList();
                });
            }

            this.columnsList.appendChild(itemCard);
        });
    }

    openColumnEditModal(columnId) {
        this.currentColumnId = columnId;

        if (columnId) {
            // Edit mode
            const column = this.columns.find(c => c.id === columnId);
            if (!column) return;

            document.getElementById('editColumnTitle').textContent = 'Modifier la Colonne';
            this.columnId.value = column.id;
            this.columnName.value = column.name;
            this.columnEmoji.value = column.emoji;
            this.columnColor.value = column.color;
        } else {
            // Create mode
            document.getElementById('editColumnTitle').textContent = 'Nouvelle Colonne';
            this.columnForm.reset();
            this.columnId.value = '';
        }

        this.editColumnModal.classList.add('active');
        this.columnName.focus();
    }

    closeColumnEditModal() {
        this.editColumnModal.classList.remove('active');
        this.columnForm.reset();
        this.currentColumnId = null;
    }

    handleColumnSubmit(e) {
        e.preventDefault();

        const name = this.columnName.value;
        const emoji = this.columnEmoji.value;
        const color = this.columnColor.value;

        if (!name.trim()) return;

        if (this.columnId.value) {
            // Update existing
            this.updateColumn(this.columnId.value, { name, emoji, color });
            this.showToast('success', 'edit', `Colonne "${name}" mise à jour !`);
        } else {
            // Create new
            this.createColumn(name, emoji, color);
            this.showToast('success', 'add', `Colonne "${name}" créée !`);
        }

        this.renderBoard();
        this.renderColumnsList();
        this.closeColumnEditModal();
    }

    // === ROW MANAGEMENT UI ===
    openRowManagementModal() {
        this.rowModal.classList.add('active');
        this.renderRowsList();
    }

    closeRowManagementModal() {
        this.rowModal.classList.remove('active');
    }

    renderRowsList() {
        const sorted = [...this.rows].sort((a, b) => a.order - b.order);
        this.rowsList.innerHTML = '';

        sorted.forEach(row => {
            const taskCount = this.tasks.filter(t => t.rowId === row.id).length;
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.innerHTML = `
                <div class="item-info">
                    <div class="item-color-indicator" style="background-color: ${row.color}"></div>
                    <div class="item-details">
                        <div class="item-name">${this.escapeHtml(row.name)}</div>
                        <div class="item-meta">${taskCount} tâche(s)</div>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-btn edit" data-row-id="${row.id}" title="Éditer">
                        <span class="material-icons">edit</span>
                    </button>
                    ${this.rows.length > 1 ? `
                    <button class="item-btn delete" data-row-id="${row.id}" title="Supprimer">
                        <span class="material-icons">delete</span>
                    </button>
                    ` : ''}
                </div>
            `;

            itemCard.querySelector('.edit').addEventListener('click', () => {
                this.openRowEditModal(row.id);
            });

            const deleteBtn = itemCard.querySelector('.delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteRow(row.id);
                    this.renderBoard();
                    this.renderRowsList();
                });
            }

            this.rowsList.appendChild(itemCard);
        });
    }

    openRowEditModal(rowId) {
        this.currentRowId = rowId;

        if (rowId) {
            // Edit mode
            const row = this.rows.find(r => r.id === rowId);
            if (!row) return;

            document.getElementById('editRowTitle').textContent = 'Modifier la Ligne';
            this.rowId.value = row.id;
            this.rowName.value = row.name;
            this.rowColor.value = row.color;
        } else {
            // Create mode
            document.getElementById('editRowTitle').textContent = 'Nouvelle Ligne';
            this.rowForm.reset();
            this.rowId.value = '';
        }

        this.editRowModal.classList.add('active');
        this.rowName.focus();
    }

    closeRowEditModal() {
        this.editRowModal.classList.remove('active');
        this.rowForm.reset();
        this.currentRowId = null;
    }

    handleRowSubmit(e) {
        e.preventDefault();

        const name = this.rowName.value;
        const color = this.rowColor.value;

        if (!name.trim()) return;

        if (this.rowId.value) {
            // Update existing
            this.updateRow(this.rowId.value, { name, color });
            this.showToast('success', 'edit', `Ligne "${name}" mise à jour !`);
        } else {
            // Create new
            this.createRow(name, color);
            this.showToast('success', 'add', `Ligne "${name}" créée !`);
        }

        this.renderBoard();
        this.renderRowsList();
        this.closeRowEditModal();
    }

    // === TASK MODALS ===
    openTaskModal() {
        this.taskForm.reset();
        this.populateRowSelect(this.taskRow, this.rows[0]?.id);
        this.modalOverlay.classList.add('active');
        this.taskTitle.focus();
    }

    closeTaskModal() {
        this.modalOverlay.classList.remove('active');
        this.taskForm.reset();
    }

    openEditTaskModal(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentTaskId = taskId;
        this.editTaskId.value = task.id;
        this.editTaskTitle.value = task.title;
        this.editTaskDescription.value = task.description;
        this.editTaskPriority.value = task.priority;
        this.editTaskAssignee.value = task.assignee;
        this.editTaskTags.value = task.tags ? task.tags.join(', ') : '';
        this.editTaskDueDate.value = task.dueDate || '';

        this.populateRowSelect(this.editTaskRow, task.rowId);
        this.renderEditSubtasks(task);

        this.editModalOverlay.classList.add('active');
        this.editTaskTitle.focus();
    }

    closeEditTaskModal() {
        this.editModalOverlay.classList.remove('active');
        this.editTaskForm.reset();
        this.currentTaskId = null;
    }

    populateRowSelect(selectElement, selectedRowId) {
        selectElement.innerHTML = '';
        const sorted = [...this.rows].sort((a, b) => a.order - b.order);

        sorted.forEach(row => {
            const option = document.createElement('option');
            option.value = row.id;
            option.textContent = row.name;
            if (row.id === selectedRowId) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    // === FORM HANDLERS ===
    handleTaskSubmit(e) {
        e.preventDefault();

        const title = this.taskTitle.value;
        const description = this.taskDescription.value;
        const priority = this.taskPriority.value;
        const assignee = this.taskAssignee.value;
        const tags = this.parseTags(this.taskTags.value);
        const dueDate = this.taskDueDate.value;
        const rowId = this.taskRow.value || this.rows[0]?.id;
        const columnId = this.columns[0]?.id;

        if (!title.trim()) return;

        this.createTask(title, description, priority, assignee, columnId, rowId, tags, dueDate);
        this.renderBoard();
        this.updateTagFilters();
        this.showToast('success', 'check_circle', `Tâche "${title}" créée !`);
        this.closeTaskModal();
    }

    handleEditTaskSubmit(e) {
        e.preventDefault();

        const title = this.editTaskTitle.value;
        const description = this.editTaskDescription.value;
        const priority = this.editTaskPriority.value;
        const assignee = this.editTaskAssignee.value;
        const tags = this.parseTags(this.editTaskTags.value);
        const dueDate = this.editTaskDueDate.value;
        const rowId = this.editTaskRow.value;

        if (!title.trim() || !this.currentTaskId) return;

        this.updateTask(this.currentTaskId, {
            title, description, priority, assignee, tags, dueDate, rowId
        });

        this.renderBoard();
        this.updateTagFilters();
        this.showToast('success', 'edit', `Tâche "${title}" mise à jour !`);
        this.closeEditTaskModal();
    }

    handleDeleteTask() {
        if (!this.currentTaskId) return;

        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (confirm(`Supprimer "${task?.title}" ?`)) {
            this.deleteTask(this.currentTaskId);
            this.renderBoard();
            this.updateTagFilters();
            this.showToast('info', 'delete', `Tâche "${task?.title}" supprimée.`);
            this.closeEditTaskModal();
        }
    }

    // === DRAG AND DROP ===
    handleDragStart(e) {
        if (!e.target.classList.contains('task-card')) return;

        this.draggedElement = e.target;
        this.draggedElement.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        this.createDragPlaceholder();
    }

    handleDragEnd(e) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        document.querySelectorAll('.drag-placeholder').forEach(el => el.remove());
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
        this.draggedElement = null;
        this.dragPlaceholder = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const targetColumn = e.target.closest('.kanban-column');
        if (!targetColumn) return;

        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
        targetColumn.classList.add('drag-over');

        if (!this.dragPlaceholder) return;

        const columnContent = targetColumn.querySelector('.column-content');

        // Check if we're dragging within the same column
        const draggedTaskId = this.draggedElement.dataset.taskId;
        const draggedTask = this.tasks.find(t => t.id === draggedTaskId);
        const sameColumn = draggedTask && draggedTask.columnId === targetColumn.dataset.columnId &&
                          draggedTask.rowId === targetColumn.dataset.rowId;

        if (sameColumn) {
            // For same column, allow reordering
            const afterElement = this.getDragAfterElement(columnContent, e.clientY);

            if (afterElement && afterElement !== this.draggedElement) {
                columnContent.insertBefore(this.dragPlaceholder, afterElement);
            } else if (!afterElement) {
                columnContent.appendChild(this.dragPlaceholder);
            }
        } else {
            // For different columns, just append to end
            columnContent.appendChild(this.dragPlaceholder);
        }
    }

    handleDrop(e) {
        e.preventDefault();

        const targetColumn = e.target.closest('.kanban-column');
        if (!targetColumn || !this.draggedElement) return;

        const taskId = e.dataTransfer.getData('text/plain');
        const newColumnId = targetColumn.dataset.columnId;
        const newRowId = targetColumn.dataset.rowId;
        const task = this.tasks.find(t => t.id === taskId);
        const column = this.columns.find(c => c.id === newColumnId);

        // Check if we're dropping in the same column
        const sameColumn = task.columnId === newColumnId && task.rowId === newRowId;

        if (sameColumn) {
            // Reorder within the same column
            const placeholder = document.querySelector('.drag-placeholder');
            const targetElement = placeholder ? placeholder.nextElementSibling : null;

            this.reorderTasksInColumn(newColumnId, newRowId, taskId, targetElement);
            this.renderBoard();
            this.showToast('info', 'reorder', `Tâche réorganisée dans ${column.name}`);
        } else {
            // Move to different column
            const updates = { columnId: newColumnId, rowId: newRowId };
            updates.order = this.getNextOrderInColumn(newColumnId, newRowId);

            this.updateTask(taskId, updates);
            this.renderBoard();
            this.showToast('info', 'swap_horiz', `"${task.title}" → ${column.name}`);
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    createDragPlaceholder() {
        this.dragPlaceholder = document.createElement('div');
        this.dragPlaceholder.className = 'task-card drag-placeholder';
        this.dragPlaceholder.innerHTML = '<div style="text-align: center; color: var(--primary-color);">Déposer ici</div>';
    }

    // === TOUCH EVENTS FOR MOBILE ===
    handleTouchStart(e) {
        if (!e.target.classList.contains('task-card')) return;
        this.draggedElement = e.target;
        this.draggedElement.classList.add('dragging');
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (!this.draggedElement) return;
        e.preventDefault();

        const touch = e.touches[0];
        const targetColumn = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.kanban-column');

        if (targetColumn) {
            document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
            targetColumn.classList.add('drag-over');
        }
    }

    handleTouchEnd(e) {
        if (!this.draggedElement) return;

        const touch = e.changedTouches[0];
        const targetColumn = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.kanban-column');

        if (targetColumn) {
            const taskId = this.draggedElement.dataset.taskId;
            const newColumnId = targetColumn.dataset.columnId;
            const newRowId = targetColumn.dataset.rowId;
            const task = this.tasks.find(t => t.id === taskId);

            // Check if we're dropping in the same column
            const sameColumn = task.columnId === newColumnId && task.rowId === newRowId;

            if (sameColumn) {
                // For same column reordering on mobile, just update order to end
                // (mobile drag and drop is less precise, so we simplify)
                const tasksInColumn = this.tasks
                    .filter(t => t.columnId === newColumnId && t.rowId === newRowId)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                // Move task to end
                task.order = Math.max(...tasksInColumn.map(t => t.order || 0)) + 1;
                this.saveAllData();
            } else {
                // Move to different column
                const updates = { columnId: newColumnId, rowId: newRowId };
                updates.order = this.getNextOrderInColumn(newColumnId, newRowId);
                this.updateTask(taskId, updates);
            }

            this.renderBoard();
        }

        this.draggedElement.classList.remove('dragging');
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
        this.draggedElement = null;
    }

    // === TAGS MANAGEMENT ===
    parseTags(tagsString) {
        if (!tagsString || !tagsString.trim()) return [];
        return tagsString.split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0);
    }

    addTagToInput(inputElement, tag) {
        const currentValue = inputElement.value.trim();
        const currentTags = this.parseTags(currentValue);
        
        if (!currentTags.includes(tag.toLowerCase())) {
            const newValue = currentValue ? `${currentValue}, ${tag}` : tag;
            inputElement.value = newValue;
        }
    }

    getAllTags() {
        const tagSet = new Set();
        this.tasks.forEach(task => {
            if (task.tags && Array.isArray(task.tags)) {
                task.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort();
    }

    updateTagFilters() {
        const allTags = this.getAllTags();
        this.filterTags.innerHTML = '';

        if (allTags.length === 0) return;

        // Add "Tous" button
        const allBtn = document.createElement('button');
        allBtn.className = `tag-filter ${this.activeTagFilters.length === 0 ? 'active' : ''}`;
        allBtn.style.cssText = 'background-color: var(--text-secondary); color: white; border-color: var(--text-secondary);';
        allBtn.textContent = '🔍 Tous';
        allBtn.addEventListener('click', () => this.handleTagFilter(null));
        this.filterTags.appendChild(allBtn);

        // Add tag filter buttons
        allTags.forEach(tag => {
            const tagBtn = document.createElement('button');
            tagBtn.className = `tag-filter ${tag} ${this.activeTagFilters.includes(tag) ? 'active' : ''}`;
            tagBtn.textContent = tag;
            tagBtn.addEventListener('click', () => this.handleTagFilter(tag));
            this.filterTags.appendChild(tagBtn);
        });
    }

    handleTagFilter(tag) {
        if (tag === null) {
            this.activeTagFilters = [];
        } else {
            const index = this.activeTagFilters.indexOf(tag);
            if (index > -1) {
                this.activeTagFilters.splice(index, 1);
            } else {
                this.activeTagFilters.push(tag);
            }
        }
        this.updateTagFilters();
        this.renderBoard();
    }

    createTagsHtml(tags) {
        if (!tags || tags.length === 0) return '';
        return `<div class="task-tags">${tags.map(tag => 
            `<span class="task-tag ${tag}">${this.escapeHtml(tag)}</span>`
        ).join('')}</div>`;
    }

    // === SEARCH FUNCTIONALITY ===
    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.clearSearch.style.display = this.searchQuery ? 'flex' : 'none';
        this.renderBoard();
    }

    clearSearchQuery() {
        this.searchQuery = '';
        this.searchInput.value = '';
        this.clearSearch.style.display = 'none';
        this.renderBoard();
    }

    getFilteredTasks() {
        return this.tasks.filter(task => {
            // Search filter
            if (this.searchQuery) {
                const searchText = `${task.title} ${task.description} ${task.assignee}`.toLowerCase();
                if (!searchText.includes(this.searchQuery)) return false;
            }

            // Tag filter
            if (this.activeTagFilters.length > 0) {
                const hasMatchingTag = this.activeTagFilters.some(tag => 
                    task.tags && task.tags.includes(tag)
                );
                if (!hasMatchingTag) return false;
            }

            return true;
        });
    }

    // === DUE DATE FUNCTIONS ===
    createDueDateBadge(dueDate) {
        if (!dueDate) return '';

        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status, text;
        if (diffDays < 0) {
            status = 'overdue';
            text = `⚠️ Retard ${Math.abs(diffDays)}j`;
        } else if (diffDays === 0) {
            status = 'today';
            text = '🔥 Aujourd\'hui';
        } else if (diffDays <= 2) {
            status = 'soon';
            text = `⏰ ${diffDays}j`;
        } else {
            status = 'normal';
            text = `📅 ${due.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
        }

        return `<div class="task-due-date ${status}">${text}</div>`;
    }

    // === TOAST NOTIFICATIONS ===
    showToast(type, icon, message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-icons">${icon}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // === ANALYTICS ===
    openAnalyticsModal() {
        this.analyticsModal.classList.add('active');
        this.updateAnalytics();
        setTimeout(() => this.renderCharts(), 100);
    }

    closeAnalyticsModal() {
        this.analyticsModal.classList.remove('active');
        Object.values(this.charts).forEach(chart => chart?.destroy());
        this.charts = {};
    }

    updateAnalytics() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => {
            const col = this.columns.find(c => c.id === t.columnId);
            return col && col.name.toLowerCase().includes('terminé');
        }).length;
        const inProgress = this.tasks.filter(t => {
            const col = this.columns.find(c => c.id === t.columnId);
            return col && col.name.toLowerCase().includes('cours');
        }).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('inProgressTasks').textContent = inProgress;
        document.getElementById('completionRate').textContent = `${rate}%`;
    }

    renderCharts() {
        Object.values(this.charts).forEach(chart => chart?.destroy());

        // Status Chart
        const statusData = {};
        this.columns.forEach(col => {
            const count = this.tasks.filter(t => t.columnId === col.id).length;
            if (count > 0) {
                statusData[col.name] = { count, color: col.color };
            }
        });

        this.charts.status = new Chart(document.getElementById('statusChart'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData).map(d => d.count),
                    backgroundColor: Object.values(statusData).map(d => d.color),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // Priority Chart
        const priorityData = {
            'Faible': this.tasks.filter(t => t.priority === 'low').length,
            'Moyenne': this.tasks.filter(t => t.priority === 'medium').length,
            'Élevée': this.tasks.filter(t => t.priority === 'high').length,
            'Urgente': this.tasks.filter(t => t.priority === 'urgent').length
        };

        this.charts.priority = new Chart(document.getElementById('priorityChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(priorityData),
                datasets: [{
                    label: 'Nombre de tâches',
                    data: Object.values(priorityData),
                    backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#9c27b0'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // === EXPORT / IMPORT ===
    exportData() {
        const dataToExport = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            board: { name: 'Kanban Board' },
            columns: this.columns,
            rows: this.rows,
            tasks: this.tasks
        };

        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `kanban-complete-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
        this.showToast('success', 'download', 'Données exportées avec succès !');
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (!importedData.tasks) {
                    this.showToast('error', 'error', 'Format invalide !');
                    return;
                }

                const taskCount = importedData.tasks.length;
                const colCount = importedData.columns?.length || 0;
                const rowCount = importedData.rows?.length || 0;

                const message = `Importer :\n• ${taskCount} tâches\n• ${colCount} colonnes\n• ${rowCount} lignes\n\nCela remplacera vos données actuelles.`;

                if (confirm(message)) {
                    this.tasks = importedData.tasks;
                    if (importedData.columns) this.columns = importedData.columns;
                    if (importedData.rows) this.rows = importedData.rows;
                    
                    this.saveAllData();
                    this.renderBoard();
                    this.updateTagFilters();
                    this.showToast('success', 'upload', `${taskCount} tâches importées !`);
                }
            } catch (error) {
                this.showToast('error', 'error', 'Erreur d\'importation !');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // === UTILITY FUNCTIONS ===
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Aujourd\'hui';
        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    getPriorityLabel(priority) {
        const labels = {
            low: 'Faible',
            medium: 'Moyenne',
            high: 'Élevée',
            urgent: 'Urgente'
        };
        return labels[priority] || priority;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // === DUE DATE REMINDERS ===
    startDueDateReminders() {
        // Check immediately
        this.checkDueDateReminders();

        // Check every 5 minutes
        this.reminderInterval = setInterval(() => {
            this.checkDueDateReminders();
        }, 5 * 60 * 1000);

        // Update urgent badge on task changes
        this.updateUrgentBadge();
    }

    checkDueDateReminders() {
        const now = new Date();
        const currentTime = now.getTime();

        // Don't check more than once per minute
        if (currentTime - this.lastReminderCheck < 60000) return;
        this.lastReminderCheck = currentTime;

        const urgentTasks = this.getUrgentTasks();

        urgentTasks.forEach(task => {
            const taskKey = `${task.id}-${task.dueDate}`;

            // Only show notification once per session for each task-date combination
            if (!this.notificationHistory.has(taskKey)) {
                this.showDueDateReminder(task);
                this.notificationHistory.add(taskKey);
            }
        });

        this.updateUrgentBadge();
    }

    getUrgentTasks() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return this.tasks.filter(task => {
            if (!task.dueDate) return false;

            const dueDate = new Date(task.dueDate);
            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

            const diffTime = dueDateOnly - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Tasks that are overdue or due today or tomorrow
            return diffDays <= 1;
        });
    }

    showDueDateReminder(task) {
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const diffTime = dueDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let message = '';
        let icon = '';

        if (diffDays < 0) {
            message = `"${task.title}" est en retard de ${Math.abs(diffDays)} jour(s) !`;
            icon = 'error';
        } else if (diffDays === 0) {
            message = `"${task.title}" arrive à échéance aujourd'hui !`;
            icon = 'today';
        } else if (diffDays === 1) {
            message = `"${task.title}" arrive à échéance demain !`;
            icon = 'schedule';
        }

        if (message) {
            this.showToast('warning', icon, message, 8000);

            // Optional sound notification (only if user has interacted)
            this.playNotificationSound();
        }
    }

    updateUrgentBadge() {
        const urgentTasks = this.getUrgentTasks();
        const urgentCount = urgentTasks.length;

        if (urgentCount > 0) {
            this.urgentCount.textContent = urgentCount;
            this.urgentBadge.style.display = 'flex';
        } else {
            this.urgentBadge.style.display = 'none';
        }
    }

    playNotificationSound() {
        // Optional sound notification - only if user has interacted with the page
        try {
            // Create audio context and play a gentle notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Silently fail if audio is not supported or blocked
        }
    }

    // === TASK TEMPLATES ===
    applyTaskTemplate(templateKey) {
        const template = this.taskTemplates[templateKey];
        if (!template) return;

        // Apply template values to form fields
        this.taskTitle.value = template.title;
        this.taskDescription.value = template.description;
        this.taskPriority.value = template.priority;
        this.taskTags.value = template.tags.join(', ');

        // Focus on title field for completion
        this.taskTitle.focus();
        this.taskTitle.setSelectionRange(template.title.length, template.title.length);

        this.showToast('info', 'auto_fix_high', `Template "${templateKey}" appliqué !`);
    }

    // === SUBTASK UI ===
    createProgressBar(progress) {
        return `
            <div class="subtask-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                </div>
                <div class="progress-text">${progress.completed}/${progress.total} (${progress.percentage}%)</div>
            </div>
        `;
    }

    createSubtasksHtml(task) {
        if (!task.subtasks || task.subtasks.length === 0) return '';

        const subtasksHtml = task.subtasks.slice(0, 3).map(subtask => `
            <div class="subtask-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
                <input type="checkbox" ${subtask.completed ? 'checked' : ''} class="subtask-checkbox">
                <span class="subtask-text">${this.escapeHtml(subtask.text)}</span>
                <button class="subtask-delete" title="Supprimer">
                    <span class="material-icons">close</span>
                </button>
            </div>
        `).join('');

        const moreCount = task.subtasks.length > 3 ? `<div class="subtask-more">+${task.subtasks.length - 3} autres...</div>` : '';

        return `
            <div class="task-subtasks">
                ${subtasksHtml}
                ${moreCount}
            </div>
        `;
    }

    attachSubtaskEventListeners(taskElement, task) {
        // Checkbox toggles
        taskElement.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
            const subtaskId = checkbox.closest('.subtask-item').dataset.subtaskId;
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSubtask(task.id, subtaskId);
            });
        });

        // Delete buttons
        taskElement.querySelectorAll('.subtask-delete').forEach(btn => {
            const subtaskId = btn.closest('.subtask-item').dataset.subtaskId;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Supprimer cette sous-tâche ?')) {
                    this.deleteSubtask(task.id, subtaskId);
                }
            });
        });
    }

    addSubtaskFromInput() {
        const subtaskText = this.editSubtaskInput.value.trim();
        if (!subtaskText || !this.currentTaskId) return;

        if (this.addSubtask(this.currentTaskId, subtaskText)) {
            this.editSubtaskInput.value = '';
            this.renderEditSubtasks(this.tasks.find(t => t.id === this.currentTaskId));
            this.showToast('success', 'check_circle', 'Sous-tâche ajoutée !');
        }
    }

    renderEditSubtasks(task) {
        this.editSubtasksList.innerHTML = '';

        if (!task.subtasks || task.subtasks.length === 0) {
            this.editSubtasksList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: var(--spacing-md); font-size: 0.875rem;">Aucune sous-tâche</div>';
            return;
        }

        task.subtasks.forEach(subtask => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'edit-subtask-item';
            itemDiv.innerHTML = `
                <input type="checkbox" class="edit-subtask-checkbox" ${subtask.completed ? 'checked' : ''} data-subtask-id="${subtask.id}">
                <span class="edit-subtask-text ${subtask.completed ? 'completed' : ''}">${this.escapeHtml(subtask.text)}</span>
                <button class="edit-subtask-delete" data-subtask-id="${subtask.id}">
                    <span class="material-icons">delete</span>
                </button>
            `;

            // Checkbox toggle
            const checkbox = itemDiv.querySelector('.edit-subtask-checkbox');
            checkbox.addEventListener('change', () => {
                this.toggleSubtask(task.id, subtask.id);
                const textSpan = itemDiv.querySelector('.edit-subtask-text');
                textSpan.classList.toggle('completed', checkbox.checked);
            });

            // Delete button
            const deleteBtn = itemDiv.querySelector('.edit-subtask-delete');
            deleteBtn.addEventListener('click', () => {
                if (confirm('Supprimer cette sous-tâche ?')) {
                    this.deleteSubtask(task.id, subtask.id);
                    this.renderEditSubtasks(task);
                }
            });

            this.editSubtasksList.appendChild(itemDiv);
        });
    }

    // === THEME MANAGEMENT ===
    loadThemePreference() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('kanban-theme');

        if (savedTheme) {
            return savedTheme;
        }

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    saveThemePreference(theme) {
        localStorage.setItem('kanban-theme', theme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.saveThemePreference(this.currentTheme);
        this.applyTheme();

        const themeName = this.currentTheme === 'dark' ? 'sombre' : 'clair';
        this.showToast('info', 'palette', `Thème ${themeName} activé`);
    }

    updateThemeIcon() {
        if (this.themeIcon) {
            this.themeIcon.textContent = this.currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    }

    // Listen for system theme changes
    watchSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem('kanban-theme')) {
                    this.currentTheme = e.matches ? 'dark' : 'light';
                    this.applyTheme();
                }
            });
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new KanbanBoard();
});
