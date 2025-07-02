#!/usr/bin/env python3
"""
Скрипт для проверки соответствия навыков между CSV файлом и задачами
"""

import csv
import json
import os
from pathlib import Path

def read_csv_skills(csv_file):
    """Читает навыки из CSV файла"""
    skills = []
    current_group = None
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            group_name = row.get('Группа навыков', '').strip()
            skill_name = row.get('Навык', '').strip()
            
            # Если есть название группы, но нет навыка - это заголовок группы
            if group_name and not skill_name:
                current_group = group_name
                continue
            
            # Если есть навык
            if skill_name:
                # Используем группу из текущей строки или текущую группу
                target_group = group_name or current_group
                if target_group:
                    skills.append({
                        'name': skill_name,
                        'group': target_group
                    })
    
    return skills

def read_task_skills(tasks_dir):
    """Читает навыки из всех задач"""
    task_skills = []
    
    # Читаем индексный файл
    index_file = os.path.join(tasks_dir, 'index.json')
    if not os.path.exists(index_file):
        print(f"Файл {index_file} не найден")
        return task_skills
    
    with open(index_file, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
    
    # Проходим по всем группам задач
    for group in index_data.get('tasksGroups', []):
        for task_file in group.get('tasks', []):
            task_path = os.path.join(tasks_dir, task_file)
            if os.path.exists(task_path):
                try:
                    with open(task_path, 'r', encoding='utf-8') as f:
                        task_data = json.load(f)
                    
                    # Извлекаем навыки из задачи
                    for develop in task_data.get('develops', []):
                        skill_name = develop.get('skillName', '').strip()
                        if skill_name:
                            task_skills.append({
                                'name': skill_name,
                                'task_file': task_file,
                                'task_id': task_data.get('taskId', '')
                            })
                except Exception as e:
                    print(f"Ошибка чтения файла {task_path}: {e}")
    
    return task_skills

def compare_skills(csv_skills, task_skills):
    """Сравнивает навыки из CSV и задач"""
    # Создаем множества для быстрого поиска
    csv_skill_names = {skill['name'] for skill in csv_skills}
    task_skill_names = {skill['name'] for skill in task_skills}
    
    # Навыки из CSV, которых нет в задачах
    missing_in_tasks = csv_skill_names - task_skill_names
    
    # Навыки из задач, которых нет в CSV
    missing_in_csv = task_skill_names - csv_skill_names
    
    # Общие навыки
    common_skills = csv_skill_names & task_skill_names
    
    return {
        'missing_in_tasks': missing_in_tasks,
        'missing_in_csv': missing_in_csv,
        'common_skills': common_skills,
        'csv_total': len(csv_skill_names),
        'tasks_total': len(task_skill_names),
        'common_total': len(common_skills)
    }

def main():
    csv_file = 'HardSkills_4.0.csv'
    tasks_dir = 'data/tasks'
    
    print("Анализ соответствия навыков между CSV и задачами")
    print("=" * 60)
    
    # Читаем навыки из CSV
    print("Читаем навыки из CSV...")
    csv_skills = read_csv_skills(csv_file)
    print(f"Найдено навыков в CSV: {len(csv_skills)}")
    
    # Читаем навыки из задач
    print("Читаем навыки из задач...")
    task_skills = read_task_skills(tasks_dir)
    print(f"Найдено навыков в задачах: {len(task_skills)}")
    
    # Сравниваем
    print("\nСравниваем навыки...")
    comparison = compare_skills(csv_skills, task_skills)
    
    print(f"\nРезультаты сравнения:")
    print(f"Навыков в CSV: {comparison['csv_total']}")
    print(f"Навыков в задачах: {comparison['tasks_total']}")
    print(f"Общих навыков: {comparison['common_total']}")
    print(f"Покрытие задачами: {comparison['common_total'] / comparison['csv_total'] * 100:.1f}%")
    
    # Навыки из CSV, которых нет в задачах
    if comparison['missing_in_tasks']:
        print(f"\nНавыки из CSV, для которых НЕТ задач ({len(comparison['missing_in_tasks'])}):")
        for skill in sorted(comparison['missing_in_tasks']):
            print(f"  - {skill}")
    
    # Навыки из задач, которых нет в CSV
    if comparison['missing_in_csv']:
        print(f"\nНавыки из задач, которых НЕТ в CSV ({len(comparison['missing_in_csv'])}):")
        for skill in sorted(comparison['missing_in_csv']):
            # Найдем примеры задач с этим навыком
            examples = [t for t in task_skills if t['name'] == skill][:3]
            example_files = [t['task_file'] for t in examples]
            print(f"  - {skill}")
            print(f"    Примеры файлов: {', '.join(example_files)}")
    
    # Показываем группы навыков из CSV
    print(f"\nГруппы навыков в CSV:")
    groups = {}
    for skill in csv_skills:
        group = skill['group']
        if group not in groups:
            groups[group] = []
        groups[group].append(skill['name'])
    
    for group, skills in sorted(groups.items()):
        print(f"  {group}: {len(skills)} навыков")
        # Проверяем покрытие группы
        covered = sum(1 for skill in skills if skill in comparison['common_skills'])
        print(f"    Покрыто задачами: {covered}/{len(skills)} ({covered/len(skills)*100:.1f}%)")

if __name__ == '__main__':
    main() 