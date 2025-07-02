// Тестовый скрипт для проверки логики поиска задач
const fs = require('fs');
const path = require('path');

// Загружаем данные задач
async function loadTasksFromStructure() {
    const indexPath = path.join('data/tasks/index.json');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    const tasksData = [];
    
    for (const group of indexData.tasksGroups) {
        for (const taskFile of group.tasks) {
            const taskPath = path.join('data/tasks', taskFile);
            if (fs.existsSync(taskPath)) {
                try {
                    const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
                    tasksData.push(taskData);
                } catch (error) {
                    console.warn(`Error loading task file ${taskFile}:`, error.message);
                }
            }
        }
    }
    
    return tasksData;
}

// Функция поиска релевантных задач (копия из app.js)
function findRelevantTasks(selectedSkills, tasksData) {
    const relevantTasks = [];
    
    console.log('=== Поиск релевантных задач ===');
    console.log('Выбранные навыки:', selectedSkills);
    console.log('Доступные задачи:', tasksData.length);
    
    selectedSkills.forEach(skill => {
        console.log(`Ищем задачи для навыка: "${skill.name}", целевой уровень: ${skill.targetLevel}`);
        
        // Ищем задачи для развития навыка до целевого уровня
        for (let level = 0; level < skill.targetLevel; level++) {
            console.log(`  Ищем задачи для уровня ${level} → ${level + 1}`);
            
            const tasks = tasksData.filter(task => {
                const hasMatchingSkill = task.develops.some(dev => {
                    const nameMatch = dev.skillName === skill.name;
                    const levelMatch = dev.fromLevel === level && dev.toLevel === level + 1;
                    
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

// Тестируем
async function test() {
    console.log('Загружаем задачи...');
    const tasksData = await loadTasksFromStructure();
    console.log(`Загружено ${tasksData.length} задач`);
    
    // Тестовые выбранные навыки
    const selectedSkills = [
        {
            name: "Функциональное тестирование",
            targetLevel: 1
        },
        {
            name: "Тестирование безопасности", 
            targetLevel: 3
        }
    ];
    
    console.log('\nТестируем поиск задач...');
    const relevantTasks = findRelevantTasks(selectedSkills, tasksData);
    
    console.log('\nРезультат:');
    relevantTasks.forEach(task => {
        console.log(`- ${task.taskId}: ${task.taskGoal}`);
        task.develops.forEach(dev => {
            console.log(`  Развивает: ${dev.skillName} (${dev.fromLevel}→${dev.toLevel})`);
        });
    });
}

test().catch(console.error); 