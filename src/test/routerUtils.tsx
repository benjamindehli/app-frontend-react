import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

export const PageNavigationRouter =
  (currentPageId: string = 'layout1') =>
  // eslint-disable-next-line react/display-name
  ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter
      basename={'/ttd/test'}
      initialEntries={[`/ttd/test/instance/1337/dfe95272-6873-48a6-abae-57b3f7c18689/Task_1/${currentPageId}`]}
    >
      <Routes>
        <Route
          path={'instance/:partyId/:instanceGuid/*'}
          element={children}
        />
      </Routes>
    </MemoryRouter>
  );