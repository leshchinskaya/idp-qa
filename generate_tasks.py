#!/usr/bin/env python3
import csv
import json
import os
from pathlib import Path

# Маппинг групп навыков на папки
SKILL_GROUP_MAPPING = {
    "Виды тестирования": "testing-types",
    "Основы тестирования": "testing-basics", 
    "Работа с мобильными устройствами": "mobile-devices",
    "Особенности мобильного тестирования": "mobile-testing-features",
    "Алгоритмы работы с фичами": "feature-algorithms",
    "Клиент-серверное взаимодействие": "client-server",
    "Артефакты тестирования": "testing-artifacts",
    "Дизайн": "design",
    "Работа с дефектами": "defect-management",
    "Подходы управления тестированием": "testing-management-approaches",
    "Планирование тестирования": "testing-planning",
    "Процесс тестирования": "testing-process",
    "Системы ведения тестов": "test-management-systems",
    "Оценка работ тестирования": "testing-evaluation",
    "Методологии разработки и управления": "development-methodologies",
    "Управление проектом": "project-management",
    "Личная производительность": "personal-productivity",
    "Коммуникация и коллаборация": "communication-collaboration",
    "Работа с сотрудниками": "people-management",
    "Инструменты и технологии": "tools-technologies",
    "Работа со сборками": "build-management",
    "Тестирование аналитики": "analytics-testing",
    "Инструменты для работы с пушами": "push-tools",
    "Инструменты тестирования производительности": "performance-tools",
    "AQA. Технические навыки": "aqa-technical",
    "AQA. Лидерские навыки": "aqa-leadership",
    "AQA. Инструменты и технологии": "aqa-tools",
    "AQA. Алгоритм работы с фичами": "aqa-features",
    "Особенности тестирования веб-приложений": "web-testing",
    "Технологии и инструменты веб-разработки": "web-technologies",
    "Использование AI": "ai-usage"
}

def clean_skill_name(skill_name):
    """Очищает название навыка для использования в имени файла"""
    return skill_name.lower().replace(' ', '-').replace('/', '-').replace('.', '').replace(',', '').replace('(', '').replace(')', '').replace('&', 'and')

def get_level_description(level):
    """Возвращает описание уровня"""
    level_descriptions = {
        1: "базовый уровень",
        2: "средний уровень", 
        3: "продвинутый уровень",
        4: "экспертный уровень"
    }
    return level_descriptions.get(level, f"уровень {level}")

def generate_task_id(skill_name, level):
    """Генерирует ID задачи"""
    # Берем первые буквы слов навыка
    words = skill_name.split()
    prefix = ''.join([word[0].upper() for word in words[:3]])
    return f"{prefix}-{level:02d}"

def create_task_json(skill_group, skill_name, level, level_description):
    """Создает JSON структуру для задачи"""
    
    # Базовые подзадачи в зависимости от уровня
    if level == 1:
        sub_tasks = [
            {
                "title": f"Изучение теории: {skill_name}",
                "description": f"Изучить теоретические основы навыка '{skill_name}', понять основные концепции и принципы"
            },
            {
                "title": "Практическое применение",
                "description": f"Применить полученные знания на практике в простых сценариях"
            },
            {
                "title": "Создание чек-листа",
                "description": f"Составить чек-лист основных моментов для навыка '{skill_name}'"
            }
        ]
        estimated_time = "8 часов"
    elif level == 2:
        sub_tasks = [
            {
                "title": "Углубленное изучение",
                "description": f"Изучить продвинутые аспекты навыка '{skill_name}', разобрать сложные случаи"
            },
            {
                "title": "Практическое применение в проекте",
                "description": f"Применить навык '{skill_name}' в реальном проекте или сложном сценарии"
            },
            {
                "title": "Анализ и оптимизация",
                "description": f"Проанализировать эффективность применения навыка и предложить улучшения"
            }
        ]
        estimated_time = "16 часов"
    elif level == 3:
        sub_tasks = [
            {
                "title": "Внедрение на проекте",
                "description": f"Внедрить или адаптировать использование навыка '{skill_name}' на проекте"
            },
            {
                "title": "Обучение других",
                "description": f"Подготовить материалы и провести обучение коллег по навыку '{skill_name}'"
            },
            {
                "title": "Создание процесса",
                "description": f"Разработать процесс или методологию применения навыка '{skill_name}'"
            }
        ]
        estimated_time = "24 часов"
    else:  # level 4
        sub_tasks = [
            {
                "title": "Экспертное применение",
                "description": f"Решить сложные задачи любой сложности используя навык '{skill_name}'"
            },
            {
                "title": "Развитие навыка в команде",
                "description": f"Развить использование навыка '{skill_name}' на уровне команды/отдела"
            },
            {
                "title": "Инновации и улучшения",
                "description": f"Предложить инновационные подходы к использованию навыка '{skill_name}'"
            }
        ]
        estimated_time = "40 часов"
    
    task_json = {
        "taskId": generate_task_id(skill_name, level),
        "taskGoal": f"Развить навык '{skill_name}' до {get_level_description(level)}",
        "develops": [
            {
                "skillName": skill_name,
                "fromLevel": level - 1,
                "toLevel": level
            }
        ],
        "subTasks": sub_tasks,
        "artifacts": [
            {"name": f"Документация по {skill_name}", "url": "#"},
            {"name": f"Практические примеры {skill_name}", "url": "#"}
        ],
        "expectedResult": f"Освоение навыка '{skill_name}' на {get_level_description(level)}",
        "estimatedTime": estimated_time
    }
    
    return task_json

def main():
    # Читаем CSV файл
    skills_data = []
    with open('HardSkills_4.0.csv', 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        headers = next(reader)  # пропускаем заголовки
        
        current_group = None
        for row in reader:
            if row[0]:  # если есть название группы
                current_group = row[0]
            
            skill_name = row[1]
            if skill_name and current_group in SKILL_GROUP_MAPPING:
                # Определяем количество уровней по заполненным ячейкам
                levels = []
                for i in range(2, min(6, len(row))):  # максимум 4 уровня
                    if row[i].strip():
                        levels.append(i - 1)
                
                skills_data.append({
                    'group': current_group,
                    'skill': skill_name,
                    'levels': levels,
                    'descriptions': [row[i] for i in range(2, min(6, len(row)))]
                })
    
    # Создаем файлы для каждого навыка и уровня
    tasks_created = []
    
    for skill_data in skills_data:
        group_folder = SKILL_GROUP_MAPPING[skill_data['group']]
        
        for level in skill_data['levels']:
            if level > 0:  # пропускаем уровень 0
                level_desc = skill_data['descriptions'][level-1] if level-1 < len(skill_data['descriptions']) else ""
                
                filename = f"{clean_skill_name(skill_data['skill'])}-level{level}.json"
                filepath = f"data/tasks/{group_folder}/{filename}"
                
                task_json = create_task_json(
                    skill_data['group'],
                    skill_data['skill'], 
                    level,
                    level_desc
                )
                
                # Создаем папку если не существует
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                
                # Записываем JSON файл
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(task_json, f, ensure_ascii=False, indent=2)
                
                tasks_created.append(f"{group_folder}/{filename}")
                print(f"Создан файл: {filepath}")
    
    print(f"\nВсего создано {len(tasks_created)} файлов задач")
    
    # Создаем обновленный index.json
    create_updated_index(skills_data, tasks_created)

def create_updated_index(skills_data, tasks_created):
    """Создает обновленный index.json со всеми задачами"""
    
    task_groups = {}
    
    for skill_data in skills_data:
        group_name = skill_data['group']
        group_folder = SKILL_GROUP_MAPPING[group_name]
        
        if group_name not in task_groups:
            task_groups[group_name] = {
                "groupName": group_name,
                "description": f"Задачи для развития навыков группы '{group_name}'",
                "tasks": []
            }
        
        # Добавляем задачи для этого навыка
        for level in skill_data['levels']:
            if level > 0:
                filename = f"{clean_skill_name(skill_data['skill'])}-level{level}.json"
                task_path = f"{group_folder}/{filename}"
                if task_path in tasks_created:
                    task_groups[group_name]["tasks"].append(task_path)
    
    # Создаем итоговую структуру
    index_data = {
        "tasksGroups": list(task_groups.values())
    }
    
    # Записываем index.json
    with open('data/tasks/index.json', 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print("Обновлен файл data/tasks/index.json")

if __name__ == "__main__":
    main() 