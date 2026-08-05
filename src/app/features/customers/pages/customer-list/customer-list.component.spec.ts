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
    const repository = jasmine.createSpyObj<CustomerRepository>('CustomerRepository', [
      'getAll',
      'create',
      'update',
    ]);
    repository.getAll.and.resolveTo(CUSTOMERS);
    repository.create.and.callFake(async (input) => ({
      ...input,
      id: 'created',
      performance: [35, 48, 42, 61, 58, 72],
      satisfaction: 72,
      retention: 65,
      color: '#625df5',
    }));
    repository.update.and.callFake(async (id, input) => ({
      ...CUSTOMERS.find((customer) => customer.id === id)!,
      ...input,
    }));
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
  it('should create a customer from the drawer', async () => {
    const repository = TestBed.inject(CustomerRepository) as jasmine.SpyObj<CustomerRepository>;
    const add: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.customer-list__header button',
    );
    add.click();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const values: Record<string, string> = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+789',
      role: 'Designer',
      address: 'Third Street',
    };
    Object.entries(values).forEach(([name, value]) => {
      const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[formControlName="${name}"]`,
      )!;
      field.value = value;
      field.dispatchEvent(new Event('input'));
    });
    root.querySelector<HTMLButtonElement>('.customer-editor button[type="submit"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(repository.create).toHaveBeenCalled();
    expect(root.textContent).toContain('Jane Doe');
  });
  it('should open the selected customer for editing', () => {
    const action: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Actions for John Deo"]',
    );
    action.click();
    fixture.detectChanges();
    const firstName: HTMLInputElement = fixture.nativeElement.querySelector(
      '[formControlName="firstName"]',
    );
    expect(firstName.value).toBe('John');
    expect(fixture.nativeElement.querySelector('.customer-editor').textContent).toContain(
      'Edit customer',
    );
  });
});
