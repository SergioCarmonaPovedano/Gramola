import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MusicComponent } from './music'; // Importamos el nombre correcto

describe('MusicComponent', () => { // Cambiamos el nombre del bloque describe
  let component: MusicComponent;
  let fixture: ComponentFixture<MusicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MusicComponent], // Usamos el nombre correcto aquí también
    }).compileComponents();

    fixture = TestBed.createComponent(MusicComponent); // Y aquí
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
