/**
 * Unit tests for domain/EmployeeServiceContext.tsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmployeeServiceProvider, useEmployeeService } from './EmployeeServiceContext';
import { IEmployeeService } from './employeeService';

/** Simple consumer component that exposes the injected service via a data-testid. */
function ServiceConsumer(): JSX.Element {
  const service = useEmployeeService();
  return (
    <div data-testid="service">{service ? 'has-service' : 'no-service'}</div>
  );
}

describe('EmployeeServiceContext', () => {
  it('provides the default service when no service prop is supplied', () => {
    render(
      <EmployeeServiceProvider>
        <ServiceConsumer />
      </EmployeeServiceProvider>
    );
    expect(screen.getByTestId('service')).toHaveTextContent('has-service');
  });

  it('provides the injected mock service to child components', () => {
    const mockService: IEmployeeService = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    /** Consumer that calls getAll to verify the mock is wired up. */
    function CallingConsumer(): JSX.Element {
      const service = useEmployeeService();
      service.getAll();
      return <div data-testid="called">called</div>;
    }

    render(
      <EmployeeServiceProvider service={mockService}>
        <CallingConsumer />
      </EmployeeServiceProvider>
    );

    expect(screen.getByTestId('called')).toBeInTheDocument();
    expect(mockService.getAll).toHaveBeenCalledTimes(1);
  });
});
