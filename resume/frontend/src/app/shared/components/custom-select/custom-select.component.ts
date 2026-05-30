import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss',
})
export class CustomSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() selectedValue: any;
  @Input() placeholder = '';
  @Output() selectedValueChange = new EventEmitter<any>();

  isOpen = false;

  get selectedLabel(): string {
    const opt = this.options.find((o) => o.value === this.selectedValue);
    return opt?.label || this.placeholder || '';
  }

  toggleDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  selectOption(opt: SelectOption) {
    this.selectedValueChange.emit(opt.value);
    this.isOpen = false;
  }

  trackByFn(_index: number, item: SelectOption): any {
    return item.value;
  }
}
