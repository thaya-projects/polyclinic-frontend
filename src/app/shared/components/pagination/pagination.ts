import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Paginador genérico y reutilizable — cualquier página con una lista
// (tenants, usuarios, pacientes...) le pasa el total y el pageSize.
@Component({
  selector: 'app-pagination',
  imports: [FormsModule],
  templateUrl: './pagination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  page = model(1);
  pageSize = input(10);
  total = input.required<number>();

  jumpValue = signal<number | null>(null);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  start = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  end = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  pageNumbers = computed(() => {
    const totalPages = this.totalPages();
    const current = this.page();
    const from = Math.max(1, current - 2);
    const to = Math.min(totalPages, current + 2);
    const nums: number[] = [];
    for (let i = from; i <= to; i++) nums.push(i);
    return nums;
  });

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
  }

  submitJump(): void {
    const value = this.jumpValue();
    if (value == null) return;
    this.goTo(Math.round(value));
    this.jumpValue.set(null);
  }
}
