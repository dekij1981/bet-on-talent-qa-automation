export type UserData = {
  name: string;
  email: string;
  password: string;
  day: string;
  month: string;
  year: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
};

export function createUserData(): UserData {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: `QA User ${uniqueId}`,
    email: `qa.user.${uniqueId}@example.com`,
    password: 'TestPassword123!',
    day: '27',
    month: '6',
    year: '1981',
    firstName: 'QA',
    lastName: `User-${uniqueId}`,
    company: 'Test Company',
    address: 'Test Street 1',
    address2: 'Apartment 1',
    country: 'Canada',
    state: 'Ontario',
    city: 'Toronto',
    zipcode: 'M5V2T6',
    mobileNumber: '5551234567',
  };
}
