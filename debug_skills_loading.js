// Скрипт для отладки загрузки групп навыков
const fs = require('fs');
const Papa = require('papaparse');

// Загружаем CSV файл
const csvData = fs.readFileSync('HardSkills_4.0.csv', 'utf8');

// Парсим CSV
const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
    quoteChar: '"',
    escapeChar: '"',
    newline: '\n',
    transform: function(value) {
        return typeof value === 'string' ? value.trim() : value;
    }
});

console.log('CSV parsing completed. Total rows:', parsed.data.length);

// Обрабатываем данные навыков как в приложении
function processSkillsData(rawData) {
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
        
        // Если есть название группы, но нет навыка - это заголовок группы
        if (groupName && !skillName) {
            currentGroup = groupName;
            console.log(`Row ${index}: Setting current group: ${currentGroup}`);
            
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
                console.log(`Row ${index}: Skipping skill "${skillName}" - no group available`);
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
            
            console.log(`Row ${index}: Adding skill "${skillName}" to group "${targetGroup}", levels: ${levels.length}`);
            
            groups.get(targetGroup).skills.push({
                name: skillName,
                group: targetGroup,
                levels: levels
            });
        }
    });
    
    return Array.from(groups.values());
}

const skillsData = processSkillsData(parsed.data);

console.log('\n=== РЕЗУЛЬТАТЫ ОБРАБОТКИ ===');
console.log(`Всего групп: ${skillsData.length}`);

skillsData.forEach((group, index) => {
    console.log(`${index + 1}. ${group.group} (${group.skills.length} навыков)`);
    
    // Показываем первые несколько навыков для проверки
    if (group.skills.length > 0) {
        group.skills.slice(0, 3).forEach(skill => {
            console.log(`   - ${skill.name} (${skill.levels.length} уровней)`);
        });
        if (group.skills.length > 3) {
            console.log(`   ... и еще ${group.skills.length - 3} навыков`);
        }
    }
});

// Проверяем конкретные проблемные группы
console.log('\n=== ПРОВЕРКА ПРОБЛЕМНЫХ ГРУПП ===');
const problematicGroups = ['Управление проектом', 'Работа с сотрудниками'];

problematicGroups.forEach(groupName => {
    const group = skillsData.find(g => g.group === groupName);
    if (group) {
        console.log(`✅ Группа "${groupName}" найдена: ${group.skills.length} навыков`);
        group.skills.forEach(skill => {
            console.log(`   - ${skill.name} (${skill.levels.length} уровней)`);
        });
    } else {
        console.log(`❌ Группа "${groupName}" НЕ найдена`);
    }
});

// Сохраняем результат для дальнейшего анализа
fs.writeFileSync('debug_skills_output.json', JSON.stringify(skillsData, null, 2));
console.log('\nРезультат сохранен в debug_skills_output.json'); 