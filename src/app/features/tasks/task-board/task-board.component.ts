import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Task, TaskService } from '../../../core/services/task.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus, heroTrash } from '@ng-icons/heroicons/outline';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, NgIconComponent, FormsModule],
  viewProviders: [provideIcons({ heroPlus, heroTrash })],
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit {

  todoTasks: Task[] = [];
  inProgressTasks: Task[] = [];
  blockedTasks: Task[] = [];
  doneTasks: Task[] = [];

  showNewTaskModal = false;
  newTaskTitle = '';
  newTaskDescription = '';

  constructor(private taskService: TaskService) {}

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.taskService.getTasks().subscribe(tasks => {
      this.todoTasks = tasks.filter(t => t.status === 'TODO');
      this.inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
      this.blockedTasks = tasks.filter(t => t.status === 'BLOCKED');
      this.doneTasks = tasks.filter(t => t.status === 'DONE');
    });
  }

  drop(event: CdkDragDrop<Task[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      const task = event.container.data[event.currentIndex];
      let newStatus: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' = 'TODO';
      
      const containerId = event.container.id;
      if (containerId.includes('todo')) newStatus = 'TODO';
      else if (containerId.includes('progress')) newStatus = 'IN_PROGRESS';
      else if (containerId.includes('blocked')) newStatus = 'BLOCKED';
      else if (containerId.includes('done')) newStatus = 'DONE';

      this.taskService.setStatus(task.id, newStatus).subscribe(() => {
        task.status = newStatus;
      });
    }
  }

  createTask() {
    if (!this.newTaskTitle) return;

    this.taskService.createTask({
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      priority: 'MEDIUM'
    }).subscribe(newTask => {
      this.todoTasks.push(newTask);
      this.closeModal();
    });
  }

  deleteTask(task: Task) {
    this.taskService.deleteTask(task.id).subscribe(() => {
      this.loadTasks();
    });
  }

  openModal() {
    this.showNewTaskModal = true;
  }

  closeModal() {
    this.showNewTaskModal = false;
    this.newTaskTitle = '';
    this.newTaskDescription = '';
  }
}
