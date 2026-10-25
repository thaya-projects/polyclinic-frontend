import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { AuthStore } from '../../../core/services/auth-store.service';
import { PHONE_COUNTRIES, PhoneCountry, phoneCountryByIso, splitE164 } from '../../../core/constants/phone-countries.const';
import { INPUT_BASE_CLASS, isFieldInvalid } from '../../utils/form-validation.util';

// Teléfono internacional: país (código) + número local. El valor del control es E.164
// ("+59171234567") o '' — el formato que guarda el backend y que necesitan WhatsApp/SMS. El número
// local solo admite dígitos; un valor legado sin código de país se muestra tal cual en el número
// para que phoneValidator lo marque y el usuario lo corrija.
@Component({
  selector: 'app-phone-input',
  template: `
    <div class="flex gap-2">
      <select
        [value]="country().iso"
        (change)="onCountryChange($any($event.target).value)"
        (blur)="onTouched()"
        [disabled]="disabled()"
        aria-label="Código de país"
        [class]="selectClass()"
      >
        @for (c of countries; track c.iso) {
          <option [value]="c.iso">{{ c.flag }} +{{ c.dial }}</option>
        }
      </select>
      <input
        type="tel"
        inputmode="numeric"
        autocomplete="tel-national"
        [value]="national()"
        (input)="onNationalInput($any($event.target))"
        (blur)="onTouched()"
        [disabled]="disabled()"
        [placeholder]="placeholder()"
        [class]="inputClass()"
      />
    </div>
  `,
  // Default (no OnPush): el borde rojo depende de touched/invalid del control del padre, que cambia
  // sin pasar por ningún input de este componente (ej. markAllAsTouched al enviar).
  changeDetection: ChangeDetectionStrategy.Default,
})
export class PhoneInput implements ControlValueAccessor {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly authStore = inject(AuthStore);

  readonly countries = PHONE_COUNTRIES;
  readonly country = signal<PhoneCountry>(phoneCountryByIso(this.authStore.tenant()?.country_code));
  readonly national = signal('');
  readonly disabled = signal(false);

  readonly placeholder = computed(() => {
    const { min, max } = this.country();
    return min === max ? `${min} dígitos` : `${min} a ${max} dígitos`;
  });

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  private invalid(): boolean {
    return isFieldInvalid(this.ngControl?.control ?? null);
  }

  selectClass(): string {
    return `${this.borderClass()} w-28 shrink-0`;
  }

  inputClass(): string {
    return `${this.borderClass()} min-w-0 flex-1`;
  }

  private borderClass(): string {
    return this.invalid()
      ? `${INPUT_BASE_CLASS} border-red-400 focus:border-red-400 focus:ring-red-400/18`
      : `${INPUT_BASE_CLASS} border-border focus:border-brand focus:ring-brand/18`;
  }

  writeValue(value: string | null): void {
    const parts = splitE164(value, this.authStore.tenant()?.country_code);
    if (parts) {
      this.country.set(parts.country);
      this.national.set(parts.national);
    } else {
      this.country.set(phoneCountryByIso(this.authStore.tenant()?.country_code));
      this.national.set(value ?? '');
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onCountryChange(iso: string): void {
    this.country.set(phoneCountryByIso(iso));
    this.emit();
  }

  onNationalInput(target: HTMLInputElement): void {
    // Solo dígitos; sin el 0 de larga distancia nacional (ej. AR "011...").
    const digits = target.value.replace(/\D/g, '').replace(/^0+/, '');
    target.value = digits;
    this.national.set(digits);
    this.emit();
  }

  private emit(): void {
    const digits = this.national().replace(/\D/g, '');
    this.onChange(digits ? `+${this.country().dial}${digits}` : '');
  }
}
