import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MaterialsSection } from '../materials-section/materials-section';
import { StockSection } from '../stock-section/stock-section';
import { UnitsSection } from '../units-section/units-section';
import { PageTitleService } from '../../../core/services/page-title.service';

type InventoryTab = 'materials' | 'stock' | 'units';

@Component({
  selector: 'app-inventory-page',
  imports: [MaterialsSection, StockSection, UnitsSection],
  templateUrl: './inventory-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPage {
  activeTab = signal<InventoryTab>('materials');

  constructor() {
    inject(PageTitleService).set('Inventario');
  }

  setTab(tab: InventoryTab): void {
    this.activeTab.set(tab);
  }
}
