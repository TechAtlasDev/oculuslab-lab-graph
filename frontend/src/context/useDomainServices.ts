import { useContext } from 'react';
import { DomainServicesContext, type DomainServicesContextValue } from './DomainServicesContext';

export function useDomainServices(): DomainServicesContextValue {
  const context = useContext(DomainServicesContext);
  if (!context) {
    throw new Error('useDomainServices debe ser utilizado dentro de un DomainProvider');
  }
  return context;
}
