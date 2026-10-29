import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

import type { UserData } from '../data/users';

/**
 * Client for the public Automation Exercise API.
 *
 * The API answers HTTP 200 for everything, including errors (OBS-03). The real status is
 * `responseCode` in the JSON body, so that is what every method checks.
 */

type ApiBody = { responseCode: number; message?: string };

export type ApiProduct = {
  id: number;
  name: string;
  price: string;
  brand: string;
  category: { usertype: { usertype: string }; category: string };
};

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  title: string;
  birth_day: string;
  birth_month: string;
  birth_year: string;
  first_name: string;
  last_name: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
};

export type UserDetailResponse = ApiBody & { user?: ApiUser };

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  /** Setup helper: fails the test unless the account was created (responseCode 201). */
  async createAccount(user: UserData): Promise<void> {
    const body = await this.parse(
      await this.request.post('/api/createAccount', {
        form: {
          name: user.name,
          email: user.email,
          password: user.password,
          title: user.title,
          birth_date: user.birthDay,
          birth_month: user.birthMonth,
          birth_year: user.birthYear,
          firstname: user.firstName,
          lastname: user.lastName,
          company: user.company,
          address1: user.address,
          address2: user.address2,
          country: user.country,
          zipcode: user.zipcode,
          state: user.state,
          city: user.city,
          mobile_number: user.mobileNumber,
        },
      }),
    );
    expect(body.responseCode, `createAccount ${user.email}: ${body.message}`).toBe(201);
  }

  /** Returns the body; 200 = deleted, 404 = not found. The caller decides what is acceptable. */
  async deleteAccount(email: string, password: string): Promise<ApiBody> {
    return this.parse(
      await this.request.delete('/api/deleteAccount', { form: { email, password } }),
    );
  }

  /** 200 "User exists!" or 404 "User not found!". */
  async verifyLogin(email: string, password: string): Promise<ApiBody> {
    return this.parse(await this.request.post('/api/verifyLogin', { form: { email, password } }));
  }

  /** 200 with `user`, or 404 when no account has this email. */
  async getUserDetailByEmail(email: string): Promise<UserDetailResponse> {
    return this.parse(await this.request.get('/api/getUserDetailByEmail', { params: { email } }));
  }

  async searchProduct(term: string): Promise<ApiProduct[]> {
    const body = await this.parse<{ products: ApiProduct[] }>(
      await this.request.post('/api/searchProduct', { form: { search_product: term } }),
    );
    expect(body.responseCode, `searchProduct "${term}": ${body.message}`).toBe(200);
    return body.products;
  }

  async productsList(): Promise<ApiProduct[]> {
    const body = await this.parse<{ products: ApiProduct[] }>(
      await this.request.get('/api/productsList'),
    );
    expect(body.responseCode, `productsList: ${body.message}`).toBe(200);
    return body.products;
  }

  private async parse<T extends object = object>(response: APIResponse): Promise<ApiBody & T> {
    // A non-2xx status means the server itself failed, not a business error.
    expect(response.ok(), `${response.url()} returned HTTP ${response.status()}`).toBe(true);
    return (await response.json()) as ApiBody & T;
  }
}
