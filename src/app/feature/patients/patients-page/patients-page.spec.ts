import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { PatientsPage } from './patients-page';
import { Patient } from '../../../core/models/patient.model';

const PATIENT: Patient = {
  id: 'pat-1', first_name: 'Ana', last_name: 'Gómez', document_type: 'dni', document_number: '30111222',
  birth_date: null, sex: null, whatsapp_phone: '', phone_alt: null, email: null, address: null, notes: null,
  is_active: true,
};

// La ficha pasó de modal a página propia (/patients/:id) — acá solo queda
// verificar que un click en la tabla navegue ahí.
describe('PatientsPage: navegación a la ficha', () => {
  let fixture: ComponentFixture<PatientsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatientsPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(PatientsPage);
    fixture.detectChanges();
  });

  it('abrir un paciente navega a /patients/:id', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.openDetail(PATIENT);
    expect(navigate).toHaveBeenCalledWith(['/patients', 'pat-1']);
  });
});
