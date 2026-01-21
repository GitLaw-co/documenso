import { Outlet, isRouteErrorResponse } from 'react-router';

import { GenericErrorLayout } from '~/components/general/generic-error-layout';

import type { Route } from './+types/_layout';

/**
 * A layout to handle scenarios where the user is a recipient of a given resource
 * where we do not care whether they are authenticated or not.
 *
 * Such as direct template access, or signing.
 *
 * GitLaw: Hide the header entirely on all recipient pages since users
 * should navigate back to GitLaw frontend, not within Documenso.
 */
export default function RecipientLayout() {
  return (
    <div className="min-h-screen">
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const errorCode = isRouteErrorResponse(error) ? error.status : 500;

  return <GenericErrorLayout errorCode={errorCode} secondaryButton={null} primaryButton={null} />;
}
