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
        console.log('Data loaded successfully, skillsData:', skillsData);
        initializeEventListeners();
        console.log('Event listeners initialized');
        initializeTabs();
        console.log('Tabs initialized');
        renderSkillsGroups();
        console.log('Skills groups rendered, container content length:', document.getElementById('skillsGroups').innerHTML.length);
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
            escapeChar: '"',
            newline: '\n',
            transform: function(value) {
                // Очищаем значения от лишних пробелов и переносов
                return typeof value === 'string' ? value.trim() : value;
            }
        });
        
        console.log('CSV parsed:', parsed);
        if (parsed.errors && parsed.errors.length > 0) {
            console.warn('CSV parsing errors:', parsed.errors);
        }
        
        skillsData = processSkillsData(parsed.data);
        console.log('Skills data processed:', skillsData.length, 'groups');
        
        // Загружаем задания
        console.log('Loading tasks data...');
        await loadTasksFromStructure();
        console.log('Tasks loaded:', tasksData.length, 'tasks');
        
        // Инициализируем поиск
        initializeSearch();
        console.log('Search initialized');
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        throw error;
    }
}

// Загрузка задач из структурированных папок
async function loadTasksFromStructure() {
    try {
        // Загружаем индексный файл
        const indexResponse = await fetch('data/tasks/index.json');
        if (!indexResponse.ok) {
            throw new Error(`HTTP error! status: ${indexResponse.status}`);
        }
        const indexData = await indexResponse.json();
        
        tasksData = [];
        
        // Загружаем задачи из каждой группы
        for (const group of indexData.tasksGroups) {
            console.log(`Loading tasks for group: ${group.groupName}`);
            
            for (const taskFile of group.tasks) {
                try {
                    const taskResponse = await fetch(`data/tasks/${taskFile}`);
                    if (!taskResponse.ok) {
                        console.warn(`Failed to load task file: ${taskFile}`);
                        continue;
                    }
                    const taskData = await taskResponse.json();
                    tasksData.push(taskData);
                } catch (error) {
                    console.warn(`Error loading task file ${taskFile}:`, error);
                }
            }
        }
        
        console.log(`Loaded ${tasksData.length} tasks from ${indexData.tasksGroups.length} groups`);
        
    } catch (error) {
        console.error('Error loading tasks structure:', error);
        // Fallback к старому способу загрузки
        console.log('Falling back to old tasks-backup.json format...');
        try {
            const tasksResponse = await fetch('data/tasks-backup.json');
            if (!tasksResponse.ok) {
                throw new Error(`HTTP error! status: ${tasksResponse.status}`);
            }
            tasksData = await tasksResponse.json();
            console.log('Fallback successful, loaded tasks from tasks-backup.json');
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw error;
        }
    }
}

// Обработка данных навыков из CSV
function processSkillsData(rawData) {
    console.log('Processing skills data, total rows:', rawData.length);
    const groups = new Map();
    let currentGroup = null;
    
    // Фильтруем пустые строки
    const filteredData = rawData.filter(row => {
        const hasGroup = row['Группа навыков'] && row['Группа навыков'].trim();
        const hasSkill = row['Навык'] && row['Навык'].trim();
        return hasGroup || hasSkill;
    });
    
    console.log('Filtered data rows:', filteredData.length);
    
    filteredData.forEach((row, index) => {
        const groupName = row['Группа навыков'] ? row['Группа навыков'].trim() : '';
        const skillName = row['Навык'] ? row['Навык'].trim() : '';
        
        console.log(`Row ${index}: Group="${groupName}", Skill="${skillName}"`);
        
        // Если есть название группы, но нет навыка - это заголовок группы
        if (groupName && !skillName) {
            currentGroup = groupName;
            console.log(`Setting current group: ${currentGroup}`);
            
            if (!groups.has(currentGroup)) {
                groups.set(currentGroup, {
                    group: currentGroup,
                    skills: []
                });
            }
            return;
        }
        
        // Если есть навык (с группой или без)
        if (skillName) {
            // Используем группу из текущей строки или текущую группу
            const targetGroup = groupName || currentGroup;
            
            if (!targetGroup) {
                console.log(`Skipping skill "${skillName}" - no group available`);
                return;
            }
            
            if (!groups.has(targetGroup)) {
                groups.set(targetGroup, {
                    group: targetGroup,
                    skills: []
                });
            }
            
            // Обновляем текущую группу, если она была указана
            if (groupName) {
                currentGroup = targetGroup;
            }
            
            const levels = [
                row['Минимальные знания, применение для самых простых задач'],
                row['Уверенные знания, применение для повседневных задач'],
                row['Глубокие знания, применение знаний, внедрение на проекте, адаптация, обучение'],
                row['Очень глубокие знания, применение для задач любой сложности']
            ].filter(level => level && level.trim() && level.trim() !== '');
            
            console.log(`Adding skill "${skillName}" to group "${targetGroup}", levels: ${levels.length}`);
            
            groups.get(targetGroup).skills.push({
                name: skillName,
                levels: levels,
                group: targetGroup
            });
        }
    });
    
    const result = Array.from(groups.values());
    console.log(`Processed ${result.length} skill groups:`, result.map(g => `${g.group} (${g.skills.length} skills)`));
    
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
    
    // Скачивание шаблона
    document.getElementById('downloadTemplate').addEventListener('click', downloadTemplate);
    
    // Кнопки действий
    document.getElementById('generateIDP').addEventListener('click', generateIDP);
    document.getElementById('clearAll').addEventListener('click', clearAllSkills);
    // document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    
    // Модальное окно
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalConfirm').addEventListener('click', confirmSkillSelection);
    document.getElementById('modalOverlay').addEventListener('click', closeModal);
}

// Инициализация табов
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            switchTab(targetTab);
        });
    });
}

// Переключение табов
function switchTab(targetTab) {
    // Убираем активный класс со всех кнопок табов
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Скрываем все панели табов
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Активируем выбранную кнопку таба
    document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
    
    // Показываем соответствующую панель
    let targetPanel;
    switch(targetTab) {
        case 'skills':
            targetPanel = 'skillsTab';
            break;
        case 'upload':
            targetPanel = 'uploadTab';
            break;
        case 'idp':
            targetPanel = 'idpTab';
            break;
        default:
            targetPanel = 'skillsTab';
    }
    document.getElementById(targetPanel).classList.add('active');
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
    
    const html = skillsData.map((group, index) => `
        <div class="skill-group">
            <div class="group-header ${index === 0 ? 'expanded' : ''}" onclick="toggleGroup(${index})">
                <span>${escapeHtml(group.group)}</span>
                <span class="group-toggle">▼</span>
            </div>
            <div class="group-skills ${index === 0 ? 'expanded' : ''}" id="group-${index}">
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
function toggleGroup(groupIndex) {
    const groupId = `group-${groupIndex}`;
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
    
    // Создаем опции для текущего уровня (включая 0 - "нет навыка")
    const currentLevelsContainer = document.getElementById('modalCurrentLevels');
    const currentLevelsHtml = [
        `<div class="level-option current-level" onclick="selectCurrentLevel(0)" data-level="0">
            <div class="level-number">0</div>
            <div class="level-description">Нет опыта с данным навыком</div>
        </div>`
    ].concat(skill.levels.map((level, index) => `
        <div class="level-option current-level" onclick="selectCurrentLevel(${index + 1})" data-level="${index + 1}">
            <div class="level-number">${index + 1}</div>
            <div class="level-description">${escapeHtml(level)}</div>
        </div>
    `)).join('');
    
    currentLevelsContainer.innerHTML = currentLevelsHtml;
    
    // Создаем опции для целевого уровня
    const targetLevelsContainer = document.getElementById('modalTargetLevels');
    const targetLevelsHtml = skill.levels.map((level, index) => `
        <div class="level-option target-level" onclick="selectTargetLevel(${index + 1})" data-level="${index + 1}">
            <div class="level-number">${index + 1}</div>
            <div class="level-description">${escapeHtml(level)}</div>
        </div>
    `).join('');
    
    targetLevelsContainer.innerHTML = targetLevelsHtml;
    
    document.getElementById('levelModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
}

// Переменные для хранения выбранных уровней
let selectedCurrentLevel = null;
let selectedTargetLevel = null;

// Выбор текущего уровня
function selectCurrentLevel(level) {
    // Убираем выделение с других текущих уровней
    document.querySelectorAll('.level-option.current-level').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Выделяем выбранный уровень
    document.querySelector(`.current-level[data-level="${level}"]`).classList.add('selected');
    
    selectedCurrentLevel = level;
    updateConfirmButton();
}

// Выбор целевого уровня
function selectTargetLevel(level) {
    // Убираем выделение с других целевых уровней
    document.querySelectorAll('.level-option.target-level').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Выделяем выбранный уровень
    document.querySelector(`.target-level[data-level="${level}"]`).classList.add('selected');
    
    selectedTargetLevel = level;
    updateConfirmButton();
}

// Обновление состояния кнопки подтверждения
function updateConfirmButton() {
    const confirmButton = document.getElementById('modalConfirm');
    const isValid = selectedCurrentLevel !== null && 
                   selectedTargetLevel !== null && 
                   selectedTargetLevel > selectedCurrentLevel;
    
    confirmButton.disabled = !isValid;
    
    // Показываем подсказку, если целевой уровень не выше текущего
    if (selectedCurrentLevel !== null && selectedTargetLevel !== null && selectedTargetLevel <= selectedCurrentLevel) {
        confirmButton.title = 'Целевой уровень должен быть выше текущего';
    } else {
        confirmButton.title = '';
    }
}

// Подтверждение выбора навыка
function confirmSkillSelection() {
    if (!currentSkill || selectedCurrentLevel === null || selectedTargetLevel === null) return;
    
    // Проверяем, что целевой уровень выше текущего
    if (selectedTargetLevel <= selectedCurrentLevel) {
        showError('Целевой уровень должен быть выше текущего');
        return;
    }
    
    // Проверяем, не добавлен ли уже этот навык
    const existingIndex = selectedSkills.findIndex(s => s.name === currentSkill.name);
    if (existingIndex !== -1) {
        selectedSkills[existingIndex].currentLevel = selectedCurrentLevel;
        selectedSkills[existingIndex].targetLevel = selectedTargetLevel;
    } else {
        selectedSkills.push({
            name: currentSkill.name,
            group: currentSkill.group,
            levels: currentSkill.levels,
            currentLevel: selectedCurrentLevel,
            targetLevel: selectedTargetLevel
        });
    }
    
    renderSelectedSkills();
    closeModal();
    updateGenerateButton();
    
    // Переключаемся на таб "Мой ИПР" при добавлении навыка
    switchTab('idp');
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('levelModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('modalConfirm').disabled = true;
    currentSkill = null;
    selectedCurrentLevel = null;
    selectedTargetLevel = null;
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
            <div class="skill-levels-display">
                <span class="current-level">${skill.currentLevel}</span>
                <span class="level-arrow">→</span>
                <span class="target-level">${skill.targetLevel}</span>
            </div>
            <div class="skill-details">
                <h4>${escapeHtml(skill.name)}</h4>
                <p>${escapeHtml(skill.group)}</p>
            </div>
            <button class="remove-skill" onclick="removeSkill(${index})">Удалить</button>
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
        // Поддерживаем новый формат: Навык, Текущий уровень, Целевой уровень
        const skillName = row['Навык'] || row['навык'] || row['Skill'];
        const currentLevel = parseInt(row['Текущий уровень'] || row['текущий уровень'] || row['Current Level'] || 0);
        const targetLevel = parseInt(row['Целевой уровень'] || row['целевой уровень'] || row['Target Level'] || row['Level']);
        
        if (!skillName || targetLevel === undefined || isNaN(targetLevel) || targetLevel === 0) return;
        
        // Проверяем, что целевой уровень больше текущего
        if (targetLevel <= currentLevel) return;
        
        // Ищем навык в данных по точному совпадению имени
        const skill = skillsData
            .flatMap(group => group.skills)
            .find(s => s.name === skillName);
        
        // Если точного совпадения нет, ищем по частичному совпадению
        if (!skill) {
            const skillFuzzy = skillsData
                .flatMap(group => group.skills)
                .find(s => s.name.toLowerCase().includes(skillName.toLowerCase()) || 
                          skillName.toLowerCase().includes(s.name.toLowerCase()));
            
            if (skillFuzzy && targetLevel >= 1 && targetLevel <= skillFuzzy.levels.length && currentLevel >= 0) {
                // Проверяем, не добавлен ли уже этот навык
                const existingIndex = selectedSkills.findIndex(s => s.name === skillFuzzy.name);
                if (existingIndex === -1) {
                    selectedSkills.push({
                        name: skillFuzzy.name,
                        group: skillFuzzy.group,
                        levels: skillFuzzy.levels,
                        currentLevel: currentLevel,
                        targetLevel: targetLevel
                    });
                }
            }
        } else if (targetLevel >= 1 && targetLevel <= skill.levels.length && currentLevel >= 0) {
            // Проверяем, не добавлен ли уже этот навык
            const existingIndex = selectedSkills.findIndex(s => s.name === skill.name);
            if (existingIndex === -1) {
                selectedSkills.push({
                    name: skill.name,
                    group: skill.group,
                    levels: skill.levels,
                    currentLevel: currentLevel,
                    targetLevel: targetLevel
                });
            }
        }
    });
    
    renderSelectedSkills();
    updateGenerateButton();
    
    if (selectedSkills.length > 0) {
        showSuccess(`Загружено ${selectedSkills.length} навыков`);
        // Переключаемся на таб "Мой ИПР" при успешной загрузке файла
        switchTab('idp');
    } else {
        showError('Не удалось загрузить навыки. Проверьте формат файла и убедитесь, что целевые уровни больше текущих.');
    }
}

// Скачивание шаблона CSV
function downloadTemplate() {
    if (!skillsData || skillsData.length === 0) {
        showError('Данные навыков не загружены. Пожалуйста, дождитесь загрузки.');
        return;
    }
    
    // Создаем CSV данные с заголовками
    const csvData = [
        ['Навык', 'Текущий уровень', 'Целевой уровень']
    ];
    
    // Добавляем все навыки с максимальным целевым уровнем
    skillsData.forEach(group => {
        group.skills.forEach(skill => {
            // Определяем максимальный уровень для навыка (количество непустых уровней)
            const maxLevel = skill.levels.length;
            
            csvData.push([
                skill.name,
                0, // Текущий уровень по умолчанию
                maxLevel  // Целевой уровень = максимальный доступный уровень
            ]);
        });
    });
    
    // Генерируем CSV
    const csv = Papa.unparse(csvData, {
        delimiter: ',',
        header: true,
        quotes: true
    });
    
    // Создаем и скачиваем файл
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'template-skills.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showSuccess('Шаблон CSV успешно скачан! Целевые уровни установлены максимальными для каждого навыка. При необходимости скорректируйте текущие и целевые уровни.');
    } else {
        showError('Ваш браузер не поддерживает скачивание файлов.');
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
    
    console.log('=== Поиск релевантных задач ===');
    console.log('Выбранные навыки:', selectedSkills);
    console.log('Доступные задачи:', tasksData);
    
    selectedSkills.forEach(skill => {
        console.log(`Ищем задачи для навыка: "${skill.name}", текущий уровень: ${skill.currentLevel}, целевой уровень: ${skill.targetLevel}`);
        
        // Ищем задачи для развития навыка от текущего до целевого уровня
        for (let level = skill.currentLevel; level < skill.targetLevel; level++) {
            console.log(`  Ищем задачи для уровня ${level} → ${level + 1}`);
            
            const tasks = tasksData.filter(task => {
                const hasMatchingSkill = task.develops.some(dev => {
                    const nameMatch = dev.skillName === skill.name;
                    const levelMatch = dev.fromLevel === level && dev.toLevel === level + 1;
                    
                    console.log(`    Задача ${task.taskId}: навык "${dev.skillName}" (${dev.fromLevel}→${dev.toLevel})`);
                    console.log(`      Совпадение имени: ${nameMatch}, уровня: ${levelMatch}`);
                    
                    return nameMatch && levelMatch;
                });
                
                return hasMatchingSkill;
            });
            
            console.log(`  Найдено задач для уровня ${level}→${level + 1}: ${tasks.length}`);
            if (tasks.length > 0) {
                console.log(`    Задачи: ${tasks.map(t => t.taskId).join(', ')}`);
            }
            
            relevantTasks.push(...tasks);
        }
    });
    
    // Убираем дубликаты
    const uniqueTasks = relevantTasks.filter((task, index, self) => 
        index === self.findIndex(t => t.taskId === task.taskId)
    );
    
    console.log(`Итого найдено уникальных задач: ${uniqueTasks.length}`);
    console.log('=== Конец поиска ===');
    
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
        const text = `• ${skill.name} (${skill.group}) - Уровень ${skill.currentLevel} → ${skill.targetLevel}`;
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
    const idp = createIDP(relevantTasks);
    
    // Создаем структуру CSV с полной информацией из ИПР
    const csvData = [];
    
    // Заголовок ИПР
    csvData.push(['ИНДИВИДУАЛЬНЫЙ ПЛАН РАЗВИТИЯ']);
    csvData.push([]);
    
    // Общая информация
    csvData.push(['Дата создания', idp.createdDate]);
    csvData.push(['Количество навыков', idp.skillsCount]);
    csvData.push(['Количество задач', idp.tasksCount]);
    csvData.push(['Общее время', idp.estimatedTotalTime]);
    csvData.push([]);
    
    // Общая цель
    csvData.push(['ОБЩАЯ ЦЕЛЬ']);
    csvData.push([idp.generalGoal]);
    csvData.push([]);
    
    // Выбранные навыки
    csvData.push(['ВЫБРАННЫЕ НАВЫКИ']);
    csvData.push(['Навык', 'Группа', 'Текущий уровень', 'Целевой уровень']);
    selectedSkills.forEach(skill => {
        csvData.push([
            skill.name,
            skill.group,
            skill.currentLevel,
            skill.targetLevel
        ]);
    });
    csvData.push([]);
    
    // Задачи для развития
    csvData.push(['ЗАДАЧИ ДЛЯ РАЗВИТИЯ']);
    csvData.push([
        'ID задачи',
        'Цель задачи',
        'Развиваемые навыки',
        'Подзадачи',
        'Полезные ресурсы',
        'Ожидаемый результат',
        'Время выполнения'
    ]);
    
    relevantTasks.forEach(task => {
        const skills = task.develops.map(dev => `${dev.skillName} (${dev.fromLevel}→${dev.toLevel})`).join('; ');
        
        const subtasks = task.subTasks.map(st => `• ${st.title}: ${st.description}`).join('\n');
        
        const artifacts = task.artifacts.map(artifact => `• ${artifact.name}: ${artifact.url}`).join('\n');
        
        csvData.push([
            task.taskId,
            task.taskGoal,
            skills,
            subtasks,
            artifacts,
            task.expectedResult,
            task.estimatedTime
        ]);
    });
    
    // Генерируем CSV с правильными настройками для русского языка
    const csv = Papa.unparse(csvData, {
        delimiter: ',',
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        header: false
    });
    
    // Добавляем BOM для корректного отображения кириллицы в Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'individual-development-plan.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showSuccess('План развития успешно экспортирован в CSV!');
    } else {
        showError('Ваш браузер не поддерживает скачивание файлов.');
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