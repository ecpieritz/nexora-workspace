export type CustomerGender = 'male' | 'female' | 'non-binary';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: CustomerGender;
  role: string;
  address: string;
  performance: number[];
  satisfaction: number;
  retention: number;
  color: string;
}

export type CustomerFormValue = Pick<
  Customer,
  'firstName' | 'lastName' | 'email' | 'phone' | 'gender' | 'role' | 'address'
>;
