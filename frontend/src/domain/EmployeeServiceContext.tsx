/**
 * React context that provides an {@link IEmployeeService} to the component tree.
 *
 * Wrap your component tree (or just the parts under test) with
 * {@link EmployeeServiceProvider} to inject a custom/mock service.
 *
 * @module domain/EmployeeServiceContext
 *
 * @example
 * // In production code (uses the real HTTP service)
 * <EmployeeServiceProvider>
 *   <App />
 * </EmployeeServiceProvider>
 *
 * @example
 * // In tests (injects a mock service)
 * const mockService: IEmployeeService = { getAll: jest.fn(), ... };
 * render(
 *   <EmployeeServiceProvider service={mockService}>
 *     <EmployeeList />
 *   </EmployeeServiceProvider>
 * );
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { IEmployeeService, defaultEmployeeService } from './employeeService';

const EmployeeServiceContext = createContext<IEmployeeService>(defaultEmployeeService);

interface EmployeeServiceProviderProps {
  /** Optional service override. Falls back to the default HTTP service. */
  service?: IEmployeeService;
  children: ReactNode;
}

/**
 * Provides an {@link IEmployeeService} instance to all child components via React
 * context.  Pass a `service` prop to override the default implementation (e.g.
 * in tests or Storybook).
 */
export function EmployeeServiceProvider({
  service = defaultEmployeeService,
  children,
}: EmployeeServiceProviderProps): JSX.Element {
  return (
    <EmployeeServiceContext.Provider value={service}>
      {children}
    </EmployeeServiceContext.Provider>
  );
}

/**
 * Returns the nearest {@link IEmployeeService} from React context.
 *
 * @returns The injected (or default) employee service instance.
 *
 * @example
 * function MyComponent() {
 *   const service = useEmployeeService();
 *   const [employees, setEmployees] = useState<Employee[]>([]);
 *   useEffect(() => { service.getAll().then(setEmployees); }, [service]);
 *   ...
 * }
 */
export function useEmployeeService(): IEmployeeService {
  return useContext(EmployeeServiceContext);
}
