// Глобальные переменные
let skillsData = [];
let tasksData = [];
let selectedSkills = [];
let currentSkill = null;
let fuse = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing app...');
    try {
        await loadData();
        console.log('Data loaded successfully');
        initializeEventListeners();
        console.log('Event listeners initialized');
        renderSkillsGroups();
        console.log('Skills groups rendered');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка загрузки данных. Пожалуйста, перезагрузите страницу.');
        
        // Показываем подробную ошибку в контейнере
        const container = document.getElementById('skillsGroups');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <h3>Ошибка загрузки данных</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Перезагрузить страницу</button>
                </div>
            `;
        }
    }
});

// Загрузка данных
async function loadData() {
    try {
        console.log('Loading CSV data...');
        // Загружаем навыки из CSV
        const skillsResponse = await fetch('HardSkills_4.0.csv');
        if (!skillsResponse.ok) {
            throw new Error(`HTTP error! status: ${skillsResponse.status}`);
        }
        const skillsText = await skillsResponse.text();
        console.log('CSV loaded, length:', skillsText.length);
        
        // Парсим CSV
        const parsed = Papa.parse(skillsText, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            quoteChar: '"',
            escapeChar: '"'
        });
        
        console.log('CSV parsed:', parsed);
        if (parsed.errors && parsed.errors.length > 0) {
            console.warn('CSV parsing errors:', parsed.errors);
        }
        
        skillsData = processSkillsData(parsed.data);
        console.log('Skills data processed:', skillsData.length, 'groups');
        
        // Загружаем задания
        console.log('Loading tasks data...');
        const tasksResponse = await fetch('data/tasks.json');
        if (!tasksResponse.ok) {
            throw new Error(`HTTP error! status: ${tasksResponse.status}`);
        }
        tasksData = await tasksResponse.json();
        console.log('Tasks loaded:', tasksData.length, 'tasks');
        
        // Инициализируем поиск
        initializeSearch();
        console.log('Search initialized');
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        throw error;
    }
}

// Обработка данных навыков из CSV
function processSkillsData(rawData) {
    console.log('Processing skills data, rows:', rawData.length);
    const groups = new Map();
    let currentGroup = null;
    
    rawData.forEach((row, index) => {
        console.log(`Processing row ${index}:`, row);
        
        const groupName = row['Группа навыков'];
        const skillName = row['Навык'];
        
        // Если есть название группы, но нет навыка - это заголовок группы
        if (groupName && groupName.trim() && (!skillName || skillName.trim() === '')) {
            currentGroup = groupName.trim();
            console.log(`Found group header: ${currentGroup}`);
            
            if (!groups.has(currentGroup)) {
                groups.set(currentGroup, {
                    group: currentGroup,
                    skills: []
                });
            }
            return;
        }
        
        // Если есть навык, но нет группы - используем текущую группу
        if (skillName && skillName.trim() && (!groupName || groupName.trim() === '')) {
            if (!currentGroup) {
                console.log(`Skipping row ${index}: no current group for skill ${skillName}`);
                return;
            }
            
            if (!groups.has(currentGroup)) {
                groups.set(currentGroup, {
                    group: currentGroup,
                    skills: []
                });
            }
            
            const levels = [
                row['Минимальные знания, применение для самых простых задач'],
                row['Уверенные знания, применение для повседневных задач'],
                row['Глубокие знания, применение знаний, внедрение на проекте, адаптация, обучение'],
                row['Очень глубокие знания, применение для задач любой сложности']
            ].filter(level => level && level.trim() && level.trim() !== '');
            
            console.log(`Adding skill: ${skillName} to group: ${currentGroup}, levels: ${levels.length}`);
            
            groups.get(currentGroup).skills.push({
                name: skillName.trim(),
                levels: levels,
                group: currentGroup
            });
            return;
        }
        
        // Если есть и группа, и навык - обрабатываем как обычно
        if (groupName && groupName.trim() && skillName && skillName.trim()) {
            const group = groupName.trim();
            currentGroup = group;
            
            if (!groups.has(group)) {
                groups.set(group, {
                    group: group,
                    skills: []
                });
            }
            
            const levels = [
                row['Минимальные знания, применение для самых простых задач'],
                row['Уверенные знания, применение для повседневных задач'],
                row['Глубокие знания, применение знаний, внедрение на проекте, адаптация, обучение'],
                row['Очень глубокие знания, применение для задач любой сложности']
            ].filter(level => level && level.trim() && level.trim() !== '');
            
            console.log(`Adding skill: ${skillName} to group: ${group}, levels: ${levels.length}`);
            
            groups.get(group).skills.push({
                name: skillName.trim(),
                levels: levels,
                group: group
            });
            return;
        }
        
        console.log(`Skipping row ${index}: empty group and skill`);
    });
    
    const result = Array.from(groups.values());
    console.log('Final processed data:', result);
    return result;
}

// Инициализация поиска
function initializeSearch() {
    const allSkills = skillsData.flatMap(group => 
        group.skills.map(skill => ({
            ...skill,
            searchText: `${skill.name} ${skill.group}`
        }))
    );
    
    fuse = new Fuse(allSkills, {
        keys: ['name', 'group'],
        threshold: 0.3,
        includeScore: true
    });
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    // Поиск
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', handleSearch);
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        renderSkillsGroups();
    });
    
    // Загрузка файла
    const uploadFile = document.getElementById('uploadFile');
    uploadFile.addEventListener('change', handleFileUpload);
    
    // Кнопки действий
    document.getElementById('generateIDP').addEventListener('click', generateIDP);
    document.getElementById('clearAll').addEventListener('click', clearAllSkills);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    
    // Модальное окно
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalConfirm').addEventListener('click', confirmSkillSelection);
    document.getElementById('modalOverlay').addEventListener('click', closeModal);
}

// Поиск навыков
function handleSearch(event) {
    const query = event.target.value.trim();
    
    if (!query) {
        renderSkillsGroups();
        return;
    }
    
    const results = fuse.search(query);
    const filteredSkills = results.map(result => result.item);
    
    renderSearchResults(filteredSkills);
}

// Отображение результатов поиска
function renderSearchResults(skills) {
    const container = document.getElementById('skillsGroups');
    
    if (skills.length === 0) {
        container.innerHTML = '<p class="empty-state">Навыки не найдены</p>';
        return;
    }
    
    const html = skills.map(skill => `
        <div class="skill-group">
            <div class="skill-item" onclick="openLevelModal('${skill.name.replace(/'/g, "\\'")}', '${skill.group.replace(/'/g, "\\'")}')">
                <div>
                    <div class="skill-name">${escapeHtml(skill.name)}</div>
                    <div class="skill-levels">${escapeHtml(skill.group)} • ${skill.levels.length} уровней</div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Отображение групп навыков
function renderSkillsGroups() {
    console.log('Rendering skills groups, data:', skillsData);
    const container = document.getElementById('skillsGroups');
    
    if (!skillsData || skillsData.length === 0) {
        container.innerHTML = '<p class="empty-state">Навыки не загружены</p>';
        return;
    }
    
    const html = skillsData.map(group => `
        <div class="skill-group">
            <div class="group-header" onclick="toggleGroup('${group.group.replace(/'/g, "\\'")}')">
                <span>${escapeHtml(group.group)}</span>
                <span class="group-toggle">▼</span>
            </div>
            <div class="group-skills" id="group-${group.group.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}">
                ${group.skills.map(skill => `
                    <div class="skill-item" onclick="openLevelModal('${skill.name.replace(/'/g, "\\'")}', '${skill.group.replace(/'/g, "\\'")}')">
                        <div>
                            <div class="skill-name">${escapeHtml(skill.name)}</div>
                            <div class="skill-levels">${skill.levels.length} уровней</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    console.log('Generated HTML length:', html.length);
    container.innerHTML = html;
}

// Переключение группы навыков
function toggleGroup(groupName) {
    const groupId = `group-${groupName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}`;
    const groupElement = document.getElementById(groupId);
    const header = groupElement.previousElementSibling;
    
    if (groupElement.classList.contains('expanded')) {
        groupElement.classList.remove('expanded');
        header.classList.remove('expanded');
    } else {
        groupElement.classList.add('expanded');
        header.classList.add('expanded');
    }
}

// Открытие модального окна выбора уровня
function openLevelModal(skillName, groupName) {
    const skill = skillsData
        .find(group => group.group === groupName)
        ?.skills.find(s => s.name === skillName);
    
    if (!skill) return;
    
    currentSkill = skill;
    
    document.getElementById('modalSkillName').textContent = skillName;
    document.getElementById('modalSkillGroup').textContent = groupName;
    
    const levelsContainer = document.getElementById('modalLevels');
    const levelsHtml = skill.levels.map((level, index) => `
        <div class="level-option" onclick="selectLevel(${index + 1})" data-level="${index + 1}">
            <div class="level-number">${index + 1}</div>
            <div class="level-description">${escapeHtml(level)}</div>
        </div>
    `).join('');
    
    levelsContainer.innerHTML = levelsHtml;
    
    document.getElementById('levelModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
}

// Выбор уровня
function selectLevel(level) {
    // Убираем выделение с других уровней
    document.querySelectorAll('.level-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Выделяем выбранный уровень
    document.querySelector(`[data-level="${level}"]`).classList.add('selected');
    
    // Активируем кнопку подтверждения
    document.getElementById('modalConfirm').disabled = false;
}

// Подтверждение выбора навыка
function confirmSkillSelection() {
    const selectedLevel = document.querySelector('.level-option.selected');
    if (!selectedLevel || !currentSkill) return;
    
    const level = parseInt(selectedLevel.dataset.level);
    
    // Проверяем, не добавлен ли уже этот навык
    const existingIndex = selectedSkills.findIndex(s => s.name === currentSkill.name);
    if (existingIndex !== -1) {
        selectedSkills[existingIndex].targetLevel = level;
    } else {
        selectedSkills.push({
            name: currentSkill.name,
            group: currentSkill.group,
            levels: currentSkill.levels,
            targetLevel: level
        });
    }
    
    renderSelectedSkills();
    closeModal();
    updateGenerateButton();
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('levelModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('modalConfirm').disabled = true;
    currentSkill = null;
}

// Отображение выбранных навыков
function renderSelectedSkills() {
    const container = document.getElementById('selectedSkills');
    
    if (selectedSkills.length === 0) {
        container.innerHTML = '<p class="empty-state">Навыки не выбраны</p>';
        return;
    }
    
    const html = selectedSkills.map((skill, index) => `
        <div class="selected-skill">
            <div class="skill-details">
                <h4>${escapeHtml(skill.name)}</h4>
                <p>${escapeHtml(skill.group)}</p>
            </div>
            <div>
                <span class="skill-level">Уровень ${skill.targetLevel}</span>
                <button class="remove-skill" onclick="removeSkill(${index})">Удалить</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Удаление навыка
function removeSkill(index) {
    selectedSkills.splice(index, 1);
    renderSelectedSkills();
    updateGenerateButton();
}

// Очистка всех навыков
function clearAllSkills() {
    selectedSkills = [];
    renderSelectedSkills();
    updateGenerateButton();
    document.getElementById('idpSection').style.display = 'none';
}

// Обновление кнопки генерации
function updateGenerateButton() {
    const button = document.getElementById('generateIDP');
    button.disabled = selectedSkills.length === 0;
}

// Обработка загрузки файла
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
        header: true,
        complete: function(results) {
            try {
                processUploadedFile(results.data);
            } catch (error) {
                showError('Ошибка обработки файла. Проверьте формат данных.');
            }
        },
        error: function(error) {
            showError('Ошибка чтения файла.');
        }
    });
}

// Обработка загруженного файла
function processUploadedFile(data) {
    selectedSkills = [];
    
    data.forEach(row => {
        const skillName = row['Навык'] || row['навык'] || row['Skill'];
        const targetLevel = parseInt(row['Целевой уровень'] || row['целевой уровень'] || row['Level']);
        
        if (!skillName || !targetLevel) return;
        
        // Ищем навык в данных
        const skill = skillsData
            .flatMap(group => group.skills)
            .find(s => s.name.toLowerCase().includes(skillName.toLowerCase()));
        
        if (skill && targetLevel >= 1 && targetLevel <= skill.levels.length) {
            selectedSkills.push({
                name: skill.name,
                group: skill.group,
                levels: skill.levels,
                targetLevel: targetLevel
            });
        }
    });
    
    renderSelectedSkills();
    updateGenerateButton();
    
    if (selectedSkills.length > 0) {
        showSuccess(`Загружено ${selectedSkills.length} навыков`);
    } else {
        showError('Не удалось загрузить навыки. Проверьте формат файла.');
    }
}

// Генерация ИПР
function generateIDP() {
    if (selectedSkills.length === 0) return;
    
    const relevantTasks = findRelevantTasks();
    const idp = createIDP(relevantTasks);
    
    renderIDP(idp);
    document.getElementById('idpSection').style.display = 'block';
    document.getElementById('idpSection').scrollIntoView({ behavior: 'smooth' });
}

// Поиск релевантных задач
function findRelevantTasks() {
    const relevantTasks = [];
    
    selectedSkills.forEach(skill => {
        // Ищем задачи для развития навыка до целевого уровня
        for (let level = 1; level < skill.targetLevel; level++) {
            const tasks = tasksData.filter(task => 
                task.develops.some(dev => 
                    dev.skillName === skill.name && 
                    dev.fromLevel === level && 
                    dev.toLevel === level + 1
                )
            );
            relevantTasks.push(...tasks);
        }
    });
    
    // Убираем дубликаты
    const uniqueTasks = relevantTasks.filter((task, index, self) => 
        index === self.findIndex(t => t.taskId === task.taskId)
    );
    
    return uniqueTasks;
}

// Создание объекта ИПР
function createIDP(tasks) {
    const skillNames = selectedSkills.map(s => s.name).join(', ');
    const generalGoal = `Развитие профессиональных навыков в области: ${skillNames}. Достижение целевых уровней компетенций для повышения эффективности работы и расширения профессиональных возможностей.`;
    
    return {
        generalGoal: generalGoal,
        tasks: tasks,
        createdDate: new Date().toLocaleDateString('ru-RU'),
        skillsCount: selectedSkills.length,
        tasksCount: tasks.length,
        estimatedTotalTime: calculateTotalTime(tasks)
    };
}

// Расчет общего времени
function calculateTotalTime(tasks) {
    let totalHours = 0;
    
    tasks.forEach(task => {
        const timeStr = task.estimatedTime;
        const hours = parseInt(timeStr.match(/\d+/)?.[0] || 0);
        totalHours += hours;
    });
    
    return `${totalHours} часов`;
}

// Отображение ИПР
function renderIDP(idp) {
    const container = document.getElementById('idpContent');
    
    const html = `
        <div class="idp-goal">
            <h3>Общая цель</h3>
            <p>${escapeHtml(idp.generalGoal)}</p>
            <div style="margin-top: 15px; font-size: 0.9rem; color: var(--text-secondary);">
                <strong>Дата создания:</strong> ${idp.createdDate} | 
                <strong>Навыков:</strong> ${idp.skillsCount} | 
                <strong>Задач:</strong> ${idp.tasksCount} | 
                <strong>Общее время:</strong> ${idp.estimatedTotalTime}
            </div>
        </div>
        
        <div class="idp-tasks">
            ${idp.tasks.map(task => `
                <div class="task-card">
                    <div class="task-header">
                        <div class="task-id">${escapeHtml(task.taskId)}</div>
                        <div class="task-goal">${escapeHtml(task.taskGoal)}</div>
                        <div class="task-skills">
                            ${task.develops.map(dev => `
                                <span class="task-skill">${escapeHtml(dev.skillName)} (${dev.fromLevel}→${dev.toLevel})</span>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="task-section">
                        <h4>Задачи</h4>
                        <ul class="task-subtasks">
                            ${task.subTasks.map(subtask => `
                                <li>
                                    <div class="subtask-title">${escapeHtml(subtask.title)}</div>
                                    <div class="subtask-description">${escapeHtml(subtask.description)}</div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="task-section">
                        <h4>Полезные ресурсы</h4>
                        <ul class="task-artifacts">
                            ${task.artifacts.map(artifact => `
                                <li><a href="${escapeHtml(artifact.url)}" target="_blank">${escapeHtml(artifact.name)}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="task-result">
                        <strong>Ожидаемый результат:</strong> ${escapeHtml(task.expectedResult)}
                    </div>
                    
                    <div class="task-time">⏱ ${escapeHtml(task.estimatedTime)}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Экспорт в PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Настройка шрифта
    doc.setFont('helvetica');
    
    // Заголовок
    doc.setFontSize(20);
    doc.text('Индивидуальный План Развития', 20, 30);
    
    // Дата
    doc.setFontSize(12);
    doc.text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, 20, 45);
    
    // Выбранные навыки
    doc.setFontSize(16);
    doc.text('Выбранные навыки:', 20, 65);
    
    let yPos = 80;
    selectedSkills.forEach(skill => {
        doc.setFontSize(12);
        const text = `• ${skill.name} (${skill.group}) - Уровень ${skill.targetLevel}`;
        doc.text(text, 25, yPos);
        yPos += 10;
    });
    
    // Задачи
    yPos += 10;
    doc.setFontSize(16);
    doc.text('Задачи для развития:', 20, yPos);
    yPos += 15;
    
    const relevantTasks = findRelevantTasks();
    relevantTasks.forEach((task, index) => {
        if (yPos > 250) {
            doc.addPage();
            yPos = 30;
        }
        
        doc.setFontSize(14);
        doc.text(`${index + 1}. ${task.taskGoal}`, 20, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        doc.text(`ID: ${task.taskId}`, 25, yPos);
        yPos += 8;
        
        doc.text(`Время: ${task.estimatedTime}`, 25, yPos);
        yPos += 8;
        
        const resultLines = doc.splitTextToSize(`Результат: ${task.expectedResult}`, 160);
        doc.text(resultLines, 25, yPos);
        yPos += resultLines.length * 5 + 10;
    });
    
    doc.save('individual-development-plan.pdf');
}

// Экспорт в CSV
function exportToCSV() {
    const relevantTasks = findRelevantTasks();
    
    const csvData = [
        ['ID задачи', 'Цель', 'Навыки', 'Описание задач', 'Ожидаемый результат', 'Время']
    ];
    
    relevantTasks.forEach(task => {
        const skills = task.develops.map(dev => `${dev.skillName} (${dev.fromLevel}→${dev.toLevel})`).join('; ');
        const subtasks = task.subTasks.map(st => `${st.title}: ${st.description}`).join('; ');
        
        csvData.push([
            task.taskId,
            task.taskGoal,
            skills,
            subtasks,
            task.expectedResult,
            task.estimatedTime
        ]);
    });
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'individual-development-plan.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Утилиты
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function showError(message) {
    console.error(message);
    alert(message); // Простая реализация, можно заменить на toast
}

function showSuccess(message) {
    console.log(message);
    alert(message); // Простая реализация, можно заменить на toast
} 