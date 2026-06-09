import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Gramola } from './gramola';

describe('Gramola', () => {
  let component: Gramola;
  let fixture: ComponentFixture<Gramola>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gramola],
    }).compileComponents();

    fixture = TestBed.createComponent(Gramola);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
