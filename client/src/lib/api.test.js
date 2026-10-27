import { describe,it,expect } from 'vitest';
import { api } from './api';
describe('API client',()=>{it('uses the versioned API base URL by default',()=>{expect(api.defaults.baseURL).toBe('http://localhost:4000/api/v1')});it('sends cookies with requests',()=>{expect(api.defaults.withCredentials).toBe(true)})});
