export interface AppEnvironment {
  production: boolean;
  apiUrl: string;
  mockApi: {
    enabled: boolean;
    delay: number;
  };
}
