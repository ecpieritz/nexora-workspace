import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomerRepository } from '../../data-access/customer.repository';
import { Customer } from '../../models/customer.model';
import { CustomerListComponent } from './customer-list.component';

const CUSTOMERS: Customer[] = [
  {
    id: 'one',
    firstName: 'John',
    lastName: 'Deo',
    email: 'john@example.com',
    phone: '+123',
    gender: 'male',
    role: 'Designer',
    address: 'Main Street',
    performance: [20, 30, 40, 50, 60, 70],
    satisfaction: 70,
    retention: 60,
    color: '#87a8ff',
  },
  {
    id: 'two',
    firstName: 'Shelby',
    lastName: 'Goode',
    email: 'shelby@example.com',
    phone: '+456',
    gender: 'female',
    role: 'Developer',
    address: 'Second Street',
    performance: [30, 40, 50, 60, 70, 80],
    satisfaction: 80,
    retention: 75,
    color: '#ff9da8',
  },
];
describe('CustomerListComponent', () => {
  let fixture: ComponentFixture<CustomerListComponent>;
  beforeEach(async () => {
    const repository = jasmine.createSpyObj<CustomerRepository>('CustomerRepository', ['getAll']);
    repository.getAll.and.resolveTo(CUSTOMERS);
    await TestBed.configureTestingModule({
      imports: [CustomerListComponent],
      providers: [{ provide: CustomerRepository, useValue: repository }],
    }).compileComponents();
    fixture = TestBed.createComponent(CustomerListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  it('should render customers and select the first details', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.customer-details').textContent).toContain(
      'John Deo',
    );
  });
  it('should filter customers by name', () => {
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'Shelby';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Shelby Goode');
  });
  it('should update details when a customer is selected', () => {
    const rows: NodeListOf<HTMLTableRowElement> =
      fixture.nativeElement.querySelectorAll('tbody tr');
    rows[1].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.customer-details').textContent).toContain(
      'Shelby Goode',
    );
  });
});
